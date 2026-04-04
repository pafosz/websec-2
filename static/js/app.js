$(document).ready(function () {
    const viewModeSelect = $("#view-mode");
    const instituteGroup = $("#institute-group");
    const groupField = $("#group-field");
    const teacherField = $("#teacher-field");
    const groupSelect = $("#group-select");
    const teacherSearch = $("#teacher-search");
    const weekSelect = $("#week-select");
    const selectedEntityText = $("#selected-entity-text");
    const loadScheduleBtn = $("#load-schedule-btn");
    const schedulePlaceholder = $("#schedule-placeholder");
    const scheduleTableContainer = $("#schedule-table-container");
    const scheduleBody = $("#schedule-body");

    viewModeSelect.on("change", function () {
        const mode = $(this).val();

        if (mode === "group") {
            instituteGroup.removeClass("hidden");
            groupField.removeClass("hidden");
            teacherField.addClass("hidden");
            selectedEntityText.text("Режим просмотра: по группе");
        } else {
            instituteGroup.addClass("hidden");
            groupField.addClass("hidden");
            teacherField.removeClass("hidden");
            selectedEntityText.text("Режим просмотра: по преподавателю");
        }
    });

    loadScheduleBtn.on("click", function () {
        const mode = viewModeSelect.val();
        const week = weekSelect.val();

        if (mode === "group") {
            const groupName = groupSelect.find("option:selected").text();

            selectedEntityText.text(`Группа: ${groupName}. Учебная неделя: ${week}`);
        } else {
            const teacherName = teacherSearch.val().trim();

            if (!teacherName) {
                alert("Введите ФИО преподавателя");
                return;
            }

            selectedEntityText.text(`Преподаватель: ${teacherName}. Учебная неделя: ${week}`);
        }

        renderMockSchedule();
    });

    function renderMockSchedule() {
        schedulePlaceholder.addClass("hidden");
        scheduleTableContainer.removeClass("hidden");

        const mockRows = [
            {
                time: "08:00–09:35",
                monday: "Веб-разработка",
                tuesday: "—",
                wednesday: "Безопасность веб-приложений",
                thursday: "—",
                friday: "Базы данных",
                saturday: "—"
            },
            {
                time: "09:45–11:20",
                monday: "—",
                tuesday: "Форензика",
                wednesday: "—",
                thursday: "Компьютерные сети",
                friday: "—",
                saturday: "Практика по веб-разработке"
            },
            {
                time: "11:30–13:05",
                monday: "БСБД",
                tuesday: "—",
                wednesday: "—",
                thursday: "—",
                friday: "—",
                saturday: "—"
            }
        ];

        scheduleBody.empty();

        mockRows.forEach(function (row) {
            const tr = `
                <tr>
                    <td>${row.time}</td>
                    <td>${row.monday}</td>
                    <td>${row.tuesday}</td>
                    <td>${row.wednesday}</td>
                    <td>${row.thursday}</td>
                    <td>${row.friday}</td>
                    <td>${row.saturday}</td>
                </tr>
            `;
            scheduleBody.append(tr);
        });
    }
});