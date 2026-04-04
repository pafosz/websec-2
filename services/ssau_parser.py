from functools import lru_cache
from urllib.parse import urlparse, urljoin, parse_qs

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://ssau.ru"
SCHEDULE_URL = f"{BASE_URL}/rasp"

HEADERS = {"User-Agent": (
               "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
               "AppleWebKit/537.36 (KHTML, like Gecko) "
               "Chrome/135.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}

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