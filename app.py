from utils.week import get_current_study_week
from flask import Flask, jsonify, render_template, request

from services.ssau_parser import (
    get_group_schedule,
    get_groups_by_institute,
    get_institutes,
    get_teacher_schedule,
)

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/institutes")
def api_institutes():
    try:
        institutes = get_institutes()
        return jsonify({"items": institutes})
    except Exception as error:
        return (
            jsonify(
                {
                    "error": "Не удалось загрузить список институтов",
                    "details": str(error),
                }
            ),
            500,
        )


@app.route("/api/groups")
def api_groups():
    institute_id = request.args.get("institute_id", "").strip()

    if not institute_id:
        return jsonify({"error": "Параметр institute_id не передан"}), 400

    try:
        groups = get_groups_by_institute(institute_id)
        return jsonify({"items": groups})
    except Exception as error:
        return (
            jsonify(
                {
                    "error": "Не удалось загрузить список групп",
                    "details": str(error),
                }
            ),
            500,
        )


@app.route("/api/schedule/group/<group_id>")
def api_group_schedule(group_id):
    week_raw = request.args.get("week", "").strip()

    if week_raw and not week_raw.isdigit():
        return jsonify({"error": "Параметр week должен быть числом"}), 400

    week = int(week_raw) if week_raw else None

    try:
        schedule = get_group_schedule(group_id, week)
        return jsonify(schedule)
    except Exception as error:
        return (
            jsonify(
                {
                    "error": "Не удалось загрузить расписание группы",
                    "details": str(error),
                }
            ),
            500,
        )


@app.route("/api/schedule/teacher/<staff_id>")
def api_teacher_schedule(staff_id):
    week_raw = request.args.get("week", "").strip()

    if week_raw and not week_raw.isdigit():
        return jsonify({"error": "Параметр week должен быть числом"}), 400

    week = int(week_raw) if week_raw else None

    try:
        schedule = get_teacher_schedule(staff_id, week)
        return jsonify(schedule)
    except Exception as error:
        return (
            jsonify(
                {
                    "error": "Не удалось загрузить расписание преподавателя",
                    "details": str(error),
                }
            ),
            500,
        )


@app.route("/api/current-week")
def api_current_week():
    try:
        week = get_current_study_week()
        return jsonify({"week": week})
    except Exception as error:
        return (
            jsonify(
                {
                    "error": "Не удалось определить текущую учебную неделю",
                    "details": str(error),
                }
            ),
            500,
        )


if __name__ == "__main__":
    app.run(debug=True)