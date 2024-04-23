let tableSetup = ''
const header_len = 3

function setup() {
    document.querySelector('#readData').onclick = () => {
        document.querySelector("#dataTable").innerHTML = 'Processing your data...'
        navigator.clipboard.readText().then(text => {
            if (text) {
            window.sessionStorage.setItem('clipboard', text)
            populateSheet()
            } else {
                document.querySelector("#dataTable").innerHTML = 'No data found in the clipboard!'
            }
        });
    }
}

function captureTableSetup() {
    tableSetup = document.querySelector('#dataTable').innerHTML
}

function populateSheet(skip_allowed) {
    const table_data = window.sessionStorage.getItem('table')
    const table = document.querySelector("#dataTable");

    if (skip_allowed && table_data) {
        table.innerHTML = table_data
        return
    }

    const data = window.sessionStorage.getItem('clipboard')
    if (!data) {
        return
    }

    const rows = data.split("\n");

    const tbody = document.createElement('tbody')

    let count = 0
    for (let row of rows) {
        if (row.length < 1) {
            continue
        }
        if (row[row.length - 1] == '\r') {
            row = row.substring(0, row.length - 1)
        }
        const cells = row.split("\t");

        row = document.createElement('tr')
        tbody.appendChild(row)

        let cell
        count = -1
        for (let cellData of cells) {
            count += 1
            if (count == header_len) {
                break
            }
            cell = document.createElement('td')
            cell.innerHTML = cellData
            row.appendChild(cell)
        }
    }

    table.innerHTML = tableSetup
    table.appendChild(tbody)
    window.sessionStorage.setItem('table', table.innerHTML)
}

function main() {
    setup()
}

$('document').ready(() => {
    main();
    captureTableSetup();
    populateSheet(true)
});
