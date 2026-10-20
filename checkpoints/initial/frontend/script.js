// ====================================
// AQUAOPS MAINTENANCE MANAGEMENT
// ====================================


// 1. Our default maintenance tasks

const defaultTasks = [

    {
        id: 1,
        name: "Filter Clean & Backwash",
        status: "Scheduled"
    },

    {
        id: 2,
        name: "Chemical Delivery",
        status: "Confirmed"
    },

    {
        id: 3,
        name: "Heater Inspection",
        status: "In Progress"
    }

];


// 2. Load previously saved tasks

const savedTasks = localStorage.getItem("aquaopsTasksV2");

let tasks = savedTasks
    ? JSON.parse(savedTasks)
    : defaultTasks;


// 3. Save tasks

function saveTasks() {

    localStorage.setItem(
        "aquaopsTasksV2",
        JSON.stringify(tasks)
    );

}


// 4. Display the maintenance tasks

function renderTasks() {

    const taskList = document.getElementById("maintenance-list");

    taskList.innerHTML = "";

    tasks.forEach(function(task) {

        const taskElement = document.createElement("div");

        taskElement.className = "task-item";

        const taskName = document.createElement("span");

        taskName.textContent = task.name;

        const statusSelect = document.createElement("select");

        statusSelect.className = "task-status";

        const statuses = [
            "Scheduled",
            "Confirmed",
            "In Progress",
            "Completed"
        ];

        statuses.forEach(function(status) {

            const option = document.createElement("option");

            option.value = status;
            option.textContent = status;

            statusSelect.appendChild(option);

        });

        statusSelect.value = task.status;

        statusSelect.addEventListener("change", function() {

            task.status = statusSelect.value;

            saveTasks();

        });

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-task";

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function() {

            tasks = tasks.filter(function(item) {

                return item.id !== task.id;

            });

            saveTasks();

            renderTasks();

        });

        const controls = document.createElement("div");

        controls.className = "task-controls";

        controls.appendChild(statusSelect);

        controls.appendChild(deleteButton);

        taskElement.appendChild(taskName);

        taskElement.appendChild(controls);

        taskList.appendChild(taskElement);

    });

}


// 5. Add a new maintenance task

function addTask() {

    const input = document.getElementById("new-task");

    const taskName = input.value.trim();

    if (taskName === "") {

        alert("Please enter a maintenance task.");

        return;

    }

    const newTask = {

        id: Date.now(),

        name: taskName,

        status: "Scheduled"

    };

    tasks.push(newTask);

    saveTasks();

    renderTasks();

    input.value = "";

}


// 6. Connect our buttons

document.addEventListener("DOMContentLoaded", function() {

    renderTasks();

    document.getElementById("add-task-btn")
        .addEventListener("click", addTask);

    document.getElementById("new-task")
        .addEventListener("keydown", function(event) {

            if (event.key === "Enter") {

                addTask();

            }

        });

});

// ====================================
// AQUAOPS CHEMISTRY LOGGER
// ====================================

// Load previously saved chemistry readings

let chemistryReadings = JSON.parse(
    localStorage.getItem("aquaopsChemistry") || "[]"
);


// Display saved chemistry readings

function renderChemistry() {

    const tableBody = document.getElementById(
        "chemistry-table-body"
    );

    chemistryReadings.forEach(function(reading) {

        const row = document.createElement("tr");

        const values = [
            reading.time,
            reading.chlorine,
            reading.ph,
            reading.temperature + "°F",
            reading.alkalinity + " ppm",
            reading.notes
        ];

        values.forEach(function(value) {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        tableBody.appendChild(row);

    });

}


// Save a new chemistry reading

function saveChemistryReading() {

    const chlorine = document.getElementById(
        "chlorine"
    ).value;

    const ph = document.getElementById(
        "ph"
    ).value;

    const temperature = document.getElementById(
        "temperature"
    ).value;

    const alkalinity = document.getElementById(
        "alkalinity"
    ).value;

    const notes = document.getElementById(
        "chemistry-notes"
    ).value;


    // Check that all measurements were entered

    if (
        chlorine === "" ||
        ph === "" ||
        temperature === "" ||
        alkalinity === ""
    ) {

        alert("Please enter all chemistry measurements.");

        return;

    }


    // Basic input validation

    if (
        !Number.isFinite(Number(chlorine)) ||
        !Number.isFinite(Number(ph)) ||
        !Number.isFinite(Number(temperature)) ||
        !Number.isFinite(Number(alkalinity)) ||
        Number(chlorine) < 0 ||
        Number(ph) < 0 ||
        Number(ph) > 14 ||
        Number(alkalinity) < 0
    ) {

        alert("Please enter valid chemistry measurements.");

        return;

    }


    // Get the current time

    const now = new Date();

    const time = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });


    // Convert Celsius to Fahrenheit

    const fahrenheit =
        (Number(temperature) * 9 / 5 + 32).toFixed(1);


    // Create our reading

    const reading = {

        time: time,

        chlorine: chlorine,

        ph: ph,

        temperature: fahrenheit,

        alkalinity: alkalinity,

        notes: notes

    };


    // Add reading to our array

    chemistryReadings.push(reading);


    // Save to browser storage

    localStorage.setItem(
        "aquaopsChemistry",
        JSON.stringify(chemistryReadings)
    );


    // Clear the form

    document.getElementById("chlorine").value = "";
    document.getElementById("ph").value = "";
    document.getElementById("temperature").value = "";
    document.getElementById("alkalinity").value = "";
    document.getElementById("chemistry-notes").value = "";


    // Refresh the chemistry table

    document.getElementById(
        "chemistry-table-body"
    ).innerHTML = "";

    renderChemistry();

}


// Connect our chemistry logger to the webpage

document.addEventListener("DOMContentLoaded", function() {

    renderChemistry();

    document.getElementById("save-chemistry")
        .addEventListener(
            "click",
            saveChemistryReading
        );

});