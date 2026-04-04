from flask import Flask, jsonify, render_template, request

from services.ssau_parser import get_groups_by_institute, get_institutes

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


if __name__ == "__main__":
    app.run(debug=True)