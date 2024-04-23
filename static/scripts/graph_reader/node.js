const START_COLOR_CODE = "#9cffed"
const GAVE_UP_COLOR_CODE = "#f58787"
const CORRECT_COLOR_CODE = "#b3ffb0"
const CORRECT_ARROW_COLOR_CODE = "#08d100"
const MINIMUM_TO_BE_ANNOTATED = 10
const DEGENERATE_CODE = "No completions"
const DECIMAL_PRECISION = 2
const START_NAME = "Start"
const GAVE_UP_NAME = "Gave Up"
let next_hash = 0
const hash_to_node = {}

function Node(attempt, is_correct) {
    this.appearances = []
    this.distance_sum = 0
    this.successful_appearances = 0
    this.attempt = attempt
    this.is_correct = is_correct
    this.node_list = {}
    this.hash_code = next_hash
    hash_to_node[this.hash_code] = this
    next_hash += 1

    this.add_next = (next_node, user_string) => {
        if (!this.node_list[next_node.hash_code]) {
            this.node_list[next_node.hash_code] = [user_string]
        } else {
            this.node_list[next_node.hash_code].push(user_string)
        }
    }

    this.calculate_goodness = () => {
        if (this.is_correct) {
            return 2
        } else if (this.attempt == GAVE_UP_NAME) {
            return -1
        }
        let correct = 0
        let total = 0
        for (const [key, val] of Object.entries(this.node_list)) {
            const node = hash_to_node[key]
            total += val.length
            if (node.is_correct) {
                correct += val.length
            }
        }
        // this.node_list.forEach((node) => {
        //     total += this.node_list[node].length
        //     if (node.is_correct) {
        //         correct += this.node_list[node].length
        //     }
        // })
        if (total == 0) {
            return 0
        }
        return (correct / total).toFixed(DECIMAL_PRECISION)
    }

    this.distance = () => {
        if (this.successful_appearances > 0) {
            return (this.distance_sum / this.successful_appearances).toFixed(DECIMAL_PRECISION)
        } else {
            return DEGENERATE_CODE
        }
    }

    this.return_family = () => {
        return this.return_family_helper(new Set())
    }
    
    this.return_family_helper = (already_found) => {
        already_found.add(this)
        for (const key of Object.keys(this.node_list)) {
            const node = hash_to_node[key]
            if (!already_found.has(node)) {
                already_found = node.return_family_helper(already_found)
            }
        }
        // this.node_list.forEach((node) => {
        //     if (!already_found.has(node)) {
        //         already_found = node.return_family_helper(already_found)
        //     }
        // })
        return already_found
    }

    this.find_node = (attempt, correct) => {
        for (const node of this.return_family()) {
            if (node.attempt == attempt && node.is_correct == correct) {
                return node
            }
        }
        // this.return_family().forEach((node) => {
        //     if (node.attempt == attempt && node.is_correct == correct) {
        //         return node
        //     }
        // })
        return null
    }

    this.add_appearance = (user_string) => {
        this.appearances.push(user_string)
    }

    this.add_successful_appearance = () => {
        this.successful_appearances += 1
    }

    this.add_distance = (distance) => {
        this.distance_sum += distance
    }

    this.to_dict = () => {
        return {"id": this.get_hash_code(), "name": this.attempt, "distance": this.distance(), "score": this.calculate_goodness(), "appearances": this.appearances.length, "users": this.appearances}
    }

    this.edge_dict = () => {
        const edges = []
        for (const [key, value] of Object.entries(this.node_list)) {
            const node = hash_to_node[key]
            edges.push({"source": this.get_hash_code(), "target": node.get_hash_code(), "size": value.length, "users": value})
        }
        return edges
        // this.node_list.forEach((dest) => {
        //     edges.push({"source": this.get_hash_code(), "target": dest.get_hash_code(), "size": this.node_list.get(dest).length, "users": this.node_list.get(dest)})
        // })
    }

    this.get_hash_code = () => {
        return this.hash_code
    }

    this.better_than = (other) => {
        if (this.is_correct) {
            return true
        } else if (other.is_correct) {
            return false
        } else if (this.successful_appearances == 0) {
            return false
        } else if (other.successful_appearances == 0) {
            return true
        } else {
            return (other.distance_sum / other.successful_appearances) > (this.distance_sum / this.successful_appearances)
        }
    }
}