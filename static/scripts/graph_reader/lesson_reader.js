function lesson_to_json(csv_text) {
    const [root, users] = _lesson_to_graph(csv_text)
    const nodes = []
    const edges = []
    const root_family = root.return_family()
    for (const node of root_family) {
        nodes.push(node.to_dict())
        let edge_dict = node.edge_dict()
        edge_dict.forEach(edge => {
            edges.push(edge)
        })
    }
    
    return {"nodes": nodes, "links": edges, "users": users}
}


function _lesson_to_graph(csv_text) {
    const is_anonymous = false
    const user_key_index = 0
    const user_answer_index = 1
    const user_correct_index = 2

    let user_number = 0
    const start_node = new Node(START_NAME, false)
    if (csv_text.length == 0) {
        return [start_node, {}]
    }
    const users_dict = {}
    let nodes_in_chain = []
    const end_node = new Node(GAVE_UP_NAME, false)
    
    let prev_node = start_node
    nodes_in_chain.push(start_node)
    let prev_student = -1
    let rows = csv_text.split("SPLITHURTIG")
    rows = rows.slice(0, rows.length - 1).sort((a, b) => {
        const a_key = a.split(',')[user_key_index]
        const b_key = b.split(',')[user_key_index]
        return a_key < b_key ? -1 : (a_key > b_key ? 1 : 0)
    })
    for(let i = 0; i < rows.length; i++) {
        const row_array = rows[i].split(',')
        const user_key = row_array[user_key_index]
        const code = row_array[user_answer_index]
        
        if (user_key != prev_student) {
            user_number += 1
            users_dict[user_number.toString()] = _user_to_dict(user_key, user_number.toString(), is_anonymous)
            
            if (prev_node != start_node) {
                prev_node.add_next(end_node, (user_number - 1).toString())
                end_node.add_appearance((user_number - 1).toString())
                nodes_in_chain = []
                nodes_in_chain.push(start_node)
                prev_node = start_node
            }
            prev_student = user_key
            start_node.add_appearance(user_number.toString())
        }

        users_dict[(user_number.toString())]['attempts'] += 1
        const answer_correct = row_array[user_correct_index] == '1'
        current_node = start_node.find_node(code, answer_correct)
        if (!current_node) {
            current_node = new Node(code, answer_correct)
        }
        prev_node.add_next(current_node, (user_number).toString())
        nodes_in_chain.push(current_node)
        current_node.add_appearance(user_number.toString())
        if (answer_correct) {
            let chain_length = nodes_in_chain.length
            nodes_in_chain.forEach(node => {
                chain_length -= 1
                node.add_distance(chain_length)
                node.add_successful_appearance()
            })
            nodes_in_chain = []
            current_node = start_node
            nodes_in_chain.push(current_node)
        }
        prev_node = current_node
    }
    // post iteration!
    if (prev_node != start_node) {
        prev_node.add_next(end_node, user_number.toString())
        end_node.add_appearance(user_number.toString())
    }
    
    return [start_node, users_dict]
}


function _user_to_dict(user, user_number, is_anonymous) {
    return is_anonymous? {"name": user_number, "attempts": 0} : {"name": user, "attempts": 0}
}
