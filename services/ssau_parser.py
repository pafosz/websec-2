import re
from functools import lru_cache
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://ssau.ru"
SCHEDULE_URL = f"{BASE_URL}/rasp"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}

WEEKDAY_HEADERS = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
]

session = requests.Session()
session.headers.update(HEADERS)


def fetch_soup(url: str) -> BeautifulSoup:
    response = session.get(url, timeout=20)
    response.raise_for_status()
    return BeautifulSoup(response.text, "lxml")


def make_absolute_url(href: str) -> str:
    return urljoin(BASE_URL, href)


@lru_cache(maxsize=1)
def get_institutes() -> list[dict]:
    soup = fetch_soup(SCHEDULE_URL)

    institutes = []
    seen_ids = set()

    for link in soup.select('a[href^="/rasp/faculty/"]'):
        href = link.get("href", "").strip()
        name = link.get_text(" ", strip=True)

        if not href or not name:
            continue

        absolute_url = make_absolute_url(href)
        faculty_id = urlparse(absolute_url).path.rstrip("/").split("/")[-1]

        if not faculty_id or faculty_id in seen_ids:
            continue

        seen_ids.add(faculty_id)
        institutes.append(
            {
                "id": faculty_id,
                "name": name,
                "url": absolute_url,
            }
        )

    institutes.sort(key=lambda item: item["name"].lower())
    return institutes


def extract_course_numbers(soup: BeautifulSoup, faculty_id: str) -> list[int]:
    courses = {1}

    for link in soup.select(f'a[href*="/rasp/faculty/{faculty_id}"]'):
        href = make_absolute_url(link.get("href", "").strip())
        parsed = urlparse(href)
        course_value = parse_qs(parsed.query).get("course", [None])[0]

        if course_value and str(course_value).isdigit():
            courses.add(int(course_value))

    return sorted(courses)


@lru_cache(maxsize=32)
def get_groups_by_institute(faculty_id: str) -> list[dict]:
    first_page_url = f"{BASE_URL}/rasp/faculty/{faculty_id}?course=1"
    first_soup = fetch_soup(first_page_url)

    course_numbers = extract_course_numbers(first_soup, faculty_id)

    groups = []
    seen_group_ids = set()

    for course_number in course_numbers:
        course_url = f"{BASE_URL}/rasp/faculty/{faculty_id}?course={course_number}"
        soup = first_soup if course_number == 1 else fetch_soup(course_url)

        for link in soup.select('a[href^="/rasp?groupId="]'):
            href = link.get("href", "").strip()
            name = link.get_text(" ", strip=True)

            if not href or not name:
                continue

            absolute_url = make_absolute_url(href)
            parsed = urlparse(absolute_url)
            group_id = parse_qs(parsed.query).get("groupId", [None])[0]

            if not group_id or group_id in seen_group_ids:
                continue

            seen_group_ids.add(group_id)
            groups.append(
                {
                    "id": group_id,
                    "name": name,
                    "course": course_number,
                    "url": absolute_url,
                }
            )

    groups.sort(key=lambda item: item["name"].lower())
    return groups


def build_group_schedule_url(group_id: str, week: int | None = None) -> str:
    params = {"groupId": group_id}

    if week is not None:
        params["selectedWeek"] = week
        params["selectedWeekday"] = 1

    return f"{SCHEDULE_URL}?{urlencode(params)}"


def build_teacher_schedule_url(staff_id: str, week: int | None = None) -> str:
    params = {"staffId": staff_id}

    if week is not None:
        params["selectedWeek"] = week
        params["selectedWeekday"] = 1

    return f"{SCHEDULE_URL}?{urlencode(params)}"


def clean_schedule_block(block, show_group_links: bool = False) -> str:
    for tag in block.find_all(["script", "style", "img", "svg", "button"]):
        tag.decompose()

    for link in block.find_all("a", href=True):
        href = link.get("href", "").strip()
        absolute_url = make_absolute_url(href)
        parsed = urlparse(absolute_url)
        query = parse_qs(parsed.query)

        group_id = query.get("groupId", [None])[0]
        if group_id:
            if not show_group_links:
                link.decompose()
                continue

            current_classes = link.get("class", [])
            if isinstance(current_classes, str):
                current_classes = [current_classes]

            link["href"] = "#"
            link["class"] = current_classes + ["group-link"]
            link["data-group-id"] = group_id
            link["data-group-name"] = link.get_text(" ", strip=True)
            continue

        staff_id = query.get("staffId", [None])[0]
        if staff_id:
            current_classes = link.get("class", [])
            if isinstance(current_classes, str):
                current_classes = [current_classes]

            link["href"] = "#"
            link["class"] = current_classes + ["teacher-link"]
            link["data-staff-id"] = staff_id
            link["data-teacher-name"] = link.get_text(" ", strip=True)
            continue

        link["href"] = absolute_url
        link["target"] = "_blank"
        link["rel"] = "noopener noreferrer"

    html = block.decode_contents().strip()

    if not html or not block.get_text(" ", strip=True):
        return "—"

    return html

def format_time_block(time_block) -> str:
    items = time_block.select(".schedule__time-item")
    parts = []

    for item in items:
        text = item.get_text(" ", strip=True)
        if text:
            text = re.sub(r"\s+", " ", text)
            parts.append(text)

    if len(parts) >= 2:
        start_match = re.search(r"\d{2}:\d{2}", parts[0])
        end_match = re.search(r"\d{2}:\d{2}", parts[1])

        if start_match and end_match:
            return f"{start_match.group()}–{end_match.group()}"

    return " ".join(parts) if parts else "—"


def parse_schedule_div_layout(soup: BeautifulSoup, show_group_links: bool = False) -> dict | None:
    schedule_items = soup.select_one("div.schedule div.schedule__items")

    if schedule_items is None:
        return None

    children = [
        child for child in schedule_items.find_all("div", recursive=False)
        if child.get("class")
    ]

    if len(children) < 7:
        return None

    header_candidates = children[:7]

    first_header_text = header_candidates[0].get_text(" ", strip=True).lower()
    if "время" not in first_header_text:
        return None

    headers = []
    for head in header_candidates[1:7]:
        weekday = head.select_one(".schedule__head-weekday")
        if weekday:
            headers.append(weekday.get_text(" ", strip=True).capitalize())
        else:
            headers.append(head.get_text(" ", strip=True).capitalize())

    rows = []
    index = 7

    while index < len(children):
        current = children[index]
        classes = current.get("class", [])

        if "schedule__time" not in classes:
            index += 1
            continue

        time_value = format_time_block(current)
        day_blocks = children[index + 1:index + 7]

        if len(day_blocks) < 6:
            break

        days = []
        for block in day_blocks:
            days.append(clean_schedule_block(block, show_group_links=show_group_links))

        rows.append(
            {
                "time": time_value,
                "days": days,
            }
        )

        index += 7

    return {
        "headers": headers if len(headers) == 6 else WEEKDAY_HEADERS,
        "rows": rows,
    }


def extract_schedule_subject_name(soup: BeautifulSoup, fallback: str) -> str:
    page_title = soup.title.get_text(" ", strip=True) if soup.title else ""

    match = re.search(r"Расписание,\s*(.+?)(?:\s*-\s*Самарский университет)?$", page_title)
    if match:
        return match.group(1).strip()

    for heading in soup.find_all(["h1", "h2"]):
        text = heading.get_text(" ", strip=True)
        if text and "Расписание" not in text:
            return text

    return fallback


def get_group_schedule(group_id: str, week: int | None = None) -> dict:
    url = build_group_schedule_url(group_id, week)
    soup = fetch_soup(url)

    page_text = soup.get_text(" ", strip=True)

    if "Расписание пока не введено!" in page_text:
        return {
            "group_id": group_id,
            "group_name": extract_schedule_subject_name(soup, group_id),
            "selected_week": week,
            "headers": WEEKDAY_HEADERS,
            "rows": [],
            "message": "Расписание пока не введено",
        }

    parsed_schedule = parse_schedule_div_layout(soup)

    if parsed_schedule is None:
        return {
            "group_id": group_id,
            "group_name": extract_schedule_subject_name(soup, group_id),
            "selected_week": week,
            "headers": WEEKDAY_HEADERS,
            "rows": [],
            "message": "Не удалось разобрать структуру расписания",
        }

    return {
        "group_id": group_id,
        "group_name": extract_schedule_subject_name(soup, group_id),
        "selected_week": week,
        "headers": parsed_schedule["headers"],
        "rows": parsed_schedule["rows"],
        "message": "",
    }


def get_teacher_schedule(staff_id: str, week: int | None = None) -> dict:
    url = build_teacher_schedule_url(staff_id, week)
    soup = fetch_soup(url)

    page_text = soup.get_text(" ", strip=True)

    if "Расписание пока не введено!" in page_text:
        return {
            "staff_id": staff_id,
            "teacher_name": extract_schedule_subject_name(soup, staff_id),
            "selected_week": week,
            "headers": WEEKDAY_HEADERS,
            "rows": [],
            "message": "Расписание пока не введено",
        }

    parsed_schedule = parse_schedule_div_layout(soup, show_group_links=True)

    if parsed_schedule is None:
        return {
            "staff_id": staff_id,
            "teacher_name": extract_schedule_subject_name(soup, staff_id),
            "selected_week": week,
            "headers": WEEKDAY_HEADERS,
            "rows": [],
            "message": "Не удалось разобрать структуру расписания преподавателя",
        }

    return {
        "staff_id": staff_id,
        "teacher_name": extract_schedule_subject_name(soup, staff_id),
        "selected_week": week,
        "headers": parsed_schedule["headers"],
        "rows": parsed_schedule["rows"],
        "message": "",
    }