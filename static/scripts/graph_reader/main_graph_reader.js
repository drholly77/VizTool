function main_graph_reader(table) {
    read_data(table)
}
let parser_results
function read_data(table) {
    if (!table) {
        alert('Sorry, you don\'t have any data loaded for this session! Go to the *data* page and insert some.')
        return
    }
    parser_results = lesson_to_json(table.trim().replaceAll('<tr>', '').replaceAll('<td>', '').replaceAll('</td></tr>', '\r\n').replaceAll('</td>', ',').replace('</tbody>', ''))
}

function filter_by_size(min_size) {
    // filtered_results = {nodes: [], links: [], users: parser_results.users}
    let iter_obj
    let i
    const allowed_ids = []
    for (i = 0; i < parser_results.nodes.length; i++) {
        iter_obj = parser_results.nodes[i]
        if (iter_obj.appearances >= min_size) {
            // filtered_results.nodes.push(iter_obj)
            allowed_ids.push(iter_obj.id)
        }
    }

    // for (i = 0; i < parser_results.links.length; i++) {
    //     iter_obj = parser_results.links[i]
    //     if (allowed_ids.includes(iter_obj.source.id) && allowed_ids.includes(iter_obj.target.id)) {
    //         filtered_results.links.push(iter_obj)
    //     }
    // }
    
    return allowed_ids
}

set_up_sidenav()
main_graph_reader(table)
