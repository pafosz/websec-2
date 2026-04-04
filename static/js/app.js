$(document).ready(function () {
    const viewModeSelect = $("#view-mode");
    const instituteGroup = $("#institute-group");
    const groupField = $("#group-field");
    const teacherField = $("#teacher-field");

    const instituteSelect = $("#institute-select");
    const groupSelect = $("#group-select");
    const teacherSearch = $("#teacher-search");
    const weekSelect = $("#week-select");

    const selectedEntityText = $("#selected-entity-text");
    const loadScheduleBtn = $("#load-schedule-btn");

    const schedulePlaceholder = $("#schedule-placeholder");
    const scheduleTableContainer = $("#schedule-table-container");
    const scheduleBody = $("#schedule-body");

    init();

    viewModeSelect.on("change", handleViewModeChange);
    instituteSelect.on("change", handleInstituteChange);
    loadScheduleBtn.on("click", handleLoadSchedule);

    function init() {
        selectedEntityText.text("Пока ничего не выбрано");
        loadInstitutes();
    }

    function handleViewModeChange() {
        const mode = viewModeSelect.val();

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
    }

    function loadInstitutes() {
        instituteSelect.html('<option value="">Загрузка институтов...</option>');

        $.getJSON("/api/institutes")
            .done(function (response) {
                fillInstitutes(response.items || []);
            })
            .fail(function (xhr) {
                console.error("Ошибка загрузки институтов:", xhr);
                instituteSelect.html('<option value="">Не удалось загрузить институты</option>');
            });
    }

    function fillInstitutes(items) {
        if (!items.length) {
            instituteSelect.html('<option value="">Институты не найдены</option>');
            return;
        }

        let options = '<option value="">Выберите институт</option>';

        items.forEach(function (item) {
            options += `<option value="${item.id}">${item.name}</option>`;
        });

        instituteSelect.html(options);
    }

    function handleInstituteChange() {
        const instituteId = instituteSelect.val();

        resetGroupSelect("Сначала выберите институт");

        if (!instituteId) {
            return;
        }

        loadGroups(instituteId);
    }

    function loadGroups(instituteId) {
        groupSelect.html('<option value="">Загрузка групп...</option>');

        $.getJSON("/api/groups", { institute_id: instituteId })
            .done(function (response) {
                fillGroups(response.items || []);
            })
            .fail(function (xhr) {
                console.error("Ошибка загрузки групп:", xhr);
                groupSelect.html('<option value="">Не удалось загрузить группы</option>');
            });
    }

    function fillGroups(items) {
        if (!items.length) {
            groupSelect.html('<option value="">Группы не найдены</option>');
            return;
        }

        let options = '<option value="">Выберите группу</option>';

        items.forEach(function (item) {
            options += `<option value="${item.id}">${item.name}</option>`;
        });

        groupSelect.html(options);
    }

    function resetGroupSelect(text) {
        groupSelect.html(`<option value="">${text}</option>`);
    }

    function handleLoadSchedule() {
        const mode = viewModeSelect.val();
        const week = weekSelect.val();

        if (mode === "group") {
            const groupId = groupSelect.val();
            const groupName = groupSelect.find("option:selected").text();

            if (!groupId) {
                alert("Сначала выберите группу");
                return;
            }

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
    }

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