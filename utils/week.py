from datetime import date, timedelta


def get_academic_year_start(today: date | None = None) -> date:
    today = today or date.today()

    if today.month >= 9:
        academic_year = today.year
    else:
        academic_year = today.year - 1

    return date(academic_year, 9, 1)


def get_monday_of_week(day: date) -> date:
    return day - timedelta(days=day.weekday())


def get_current_study_week(today: date | None = None) -> int:
    today = today or date.today()

    academic_start = get_academic_year_start(today)
    first_week_monday = get_monday_of_week(academic_start)
    current_week_monday = get_monday_of_week(today)

    week_number = ((current_week_monday - first_week_monday).days // 7) + 1

    return max(1, min(52, week_number))