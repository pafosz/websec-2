$(document).ready(function () {
    const dayHeaders = $(".day-header");
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
    teacherSearch.on("input", function () {
        $(this).removeData("staffId");
    });

    function init() {
        selectedEntityText.text("Пока ничего не выбрано");
        loadCurrentWeek();
        loadInstitutes();
    }

    function handleViewModeChange() {
        const mode = viewModeSelect.val();

        clearSchedule();

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

    function loadCurrentWeek() {
        $.getJSON("/api/current-week")
            .done(function (response) {
                if (response.week) {
                    weekSelect.val(String(response.week));
                }
            })
            .fail(function (xhr) {
                console.error("Ошибка определения текущей недели:", xhr);
            });
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
        clearSchedule();

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

            loadGroupSchedule(groupId, groupName, week);
            return;
        }

        const teacherName = teacherSearch.val().trim();
        const staffId = teacherSearch.data("staffId");

        if (!teacherName) {
            alert("Сначала выберите преподавателя");
            return;
        }

        if (!staffId) {
            alert("Откройте расписание преподавателя кликом по его имени в расписании группы");
            return;
        }

        loadTeacherSchedule(staffId, teacherName, week);
    }
    function loadGroupSchedule(groupId, groupName, week) {
        selectedEntityText.text(`Загрузка расписания группы ${groupName}...`);
        showPlaceholder("Загрузка расписания...");

        $.getJSON(`/api/schedule/group/${groupId}`, { week: week })
            .done(function (response) {
                renderGroupSchedule(response, groupName, week);
            })
            .fail(function (xhr) {
                console.error("Ошибка загрузки расписания:", xhr);

                let errorText = "Не удалось загрузить расписание";
                if (xhr.responseJSON) {
                    if (xhr.responseJSON.details) {
                        errorText += ": " + xhr.responseJSON.details;
                    } else if (xhr.responseJSON.error) {
                        errorText = xhr.responseJSON.error;
                    }
                }

                selectedEntityText.text(`Группа: ${groupName}. Учебная неделя: ${week}`);
                showPlaceholder(errorText);
            });
    }

    function loadTeacherSchedule(staffId, teacherName, week) {
        selectedEntityText.text(`Загрузка расписания преподавателя ${teacherName}...`);
        showPlaceholder("Загрузка расписания преподавателя...");

        $.getJSON(`/api/schedule/teacher/${staffId}`, { week: week })
            .done(function (response) {
                renderTeacherSchedule(response, teacherName, week);
            })
            .fail(function (xhr) {
                console.error("Ошибка загрузки расписания преподавателя:", xhr);

                let errorText = "Не удалось загрузить расписание преподавателя";
                if (xhr.responseJSON && xhr.responseJSON.details) {
                    errorText += `: ${xhr.responseJSON.details}`;
                } else if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorText = xhr.responseJSON.error;
                }

                selectedEntityText.text(`Преподаватель: ${teacherName}. Учебная неделя: ${week}`);
                showPlaceholder(errorText);
            });
    }

    function renderGroupSchedule(response, groupName, week) {
        const selectedWeek = response.selected_week || week;

        selectedEntityText.text(`Группа: ${groupName}. Учебная неделя: ${selectedWeek}`);

        if (!response.rows || !response.rows.length) {
            showPlaceholder(response.message || "Для выбранной недели занятий нет");
            return;
        }

        if (response.headers && response.headers.length === 6) {
            dayHeaders.each(function (index) {
                $(this).text(response.headers[index]);
            });
        }
        scheduleBody.empty();

        response.rows.forEach(function (row) {
            let trHtml = `<tr><td class="time-cell">${escapeHtml(row.time)}</td>`;

            row.days.forEach(function (cellHtml) {
                trHtml += `<td class="schedule-cell">${cellHtml || "—"}</td>`;
            });

            trHtml += "</tr>";
            scheduleBody.append(trHtml);
        });

        schedulePlaceholder.addClass("hidden");
        scheduleTableContainer.removeClass("hidden");
    }

    function renderTeacherSchedule(response, teacherName, week) {
        const selectedWeek = response.selected_week || week;

        selectedEntityText.text(`Преподаватель: ${teacherName}. Учебная неделя: ${selectedWeek}`);

        if (!response.rows || !response.rows.length) {
            showPlaceholder(response.message || "Для выбранной недели занятий нет");
            return;
        }

        renderScheduleTable(response);
    }

    function renderScheduleTable(response) {
        if (response.headers && response.headers.length === 6) {
            dayHeaders.each(function (index) {
                $(this).text(response.headers[index]);
            });
        }

        scheduleBody.empty();

        response.rows.forEach(function (row) {
            let trHtml = `<tr><td class="time-cell">${escapeHtml(row.time)}</td>`;

            row.days.forEach(function (cellHtml) {
                trHtml += `<td class="schedule-cell">${cellHtml || "—"}</td>`;
            });

            trHtml += "</tr>";
            scheduleBody.append(trHtml);
        });

        schedulePlaceholder.addClass("hidden");
        scheduleTableContainer.removeClass("hidden");
    }

    function clearSchedule() {
        scheduleBody.empty();
        scheduleTableContainer.addClass("hidden");
        schedulePlaceholder.removeClass("hidden");
        schedulePlaceholder.text("Здесь будет отображаться расписание");
    }

    function showPlaceholder(text) {
        scheduleBody.empty();
        scheduleTableContainer.addClass("hidden");
        schedulePlaceholder.removeClass("hidden");
        schedulePlaceholder.text(text);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    $(document).on("click", ".teacher-link", function (event) {
        event.preventDefault();

        const staffId = $(this).data("staffId");
        const teacherName = $(this).data("teacherName");
        const week = weekSelect.val();

        viewModeSelect.val("teacher");
        handleViewModeChange();

        teacherSearch.val(teacherName);
        teacherSearch.data("staffId", staffId);

        loadTeacherSchedule(staffId, teacherName, week);
    });

    $(document).on("click", ".group-link", function (event) {
        event.preventDefault();

        const groupId = $(this).data("groupId");
        const groupName = $(this).data("groupName");
        const week = weekSelect.val();

        viewModeSelect.val("group");
        handleViewModeChange();

        groupSelect.html(`<option value="${groupId}" selected>${groupName}</option>`);

        loadGroupSchedule(groupId, groupName, week);
    });
});