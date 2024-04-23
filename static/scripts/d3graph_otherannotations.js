let arrow_head = "#000000"
let border_color = "#505050"
let arrow_line_color = "#909090"
let bold_line_color = "#000000"
let gave_up_color = "#303030"
let bad_wrong_answer_color = "#ad1818"
let good_wrong_answer_color = "#fc3232"
let right_answer_color = "#16b53b"
let background_color = "#ffffff"
let opposite_background_color = "#000000"


let min_link_width = 1.2
const minSize = 6
const halo_offset = 4
const center_offset = 2
const mini_center_offset = 1.5
const curve = 0.1
const arrow_padding_offset = 11
const textFactor = 1.2
let largest = 0


var graph = graph || {}
graph.data = parser_results
graph.lesson = []
let displayingLabels = false
const svg = d3.select("#lessonGraph")
const svg_node = document.querySelector('#lessonGraph')

const filter = {}
//users that are checked
filter.checkBoxUsers = []
//users in ranked "goodness" order
filter.sliderUsers = []
//users that should be represent by opaqueness in graph (updated each tick)
filter.allowedUsers = []
Object.entries(graph.data.users).forEach((user) => {
  filter.sliderUsers.push(user[0])
})
filter.sliderUsers.sort((a, b) => {
  return graph.data.users[b].attempts - graph.data.users[a].attempts
})
const merged = new Map()
let selectedNode = ""

const zoomIn = document.querySelector("#zoomIn")
zoomIn.onclick = () => set_zoom(false)
const zoomOut = document.querySelector("#zoomOut")
zoomOut.onclick = () => set_zoom(true)

const drag = d3.drag()
  .on("start", function (d) {
    disableSimulationForces()
    simulation.alphaTarget(0.2).restart();
    d.fx = d.x
    d.fy = d.y
  })
  .on("drag", function (d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
    //merge preview stuff
    const collidedList = listCollisions(d.id, {
      "x": d3.event.x,
      "y": d3.event.y,
      "r": radius(d)
    })
    const dragged = this
    node.each(function () {
      if (collidedList.includes(this)) {
        mergePreview(this, dragged)
      } else {
        resetPreview(this)
      }
    })
  })
  .on("end", function (d) {
    const collidedList = listCollisions(d.id, {
      "x": d3.event.x,
      "y": d3.event.y,
      "r": radius(d)
    })
    if (collidedList.length) {
      //something collided!
      collidedList.push(this)
      mergeNodes(collidedList)
    }
    simulation.alpha(0.07).alphaTarget(0).restart()
    enableSimulationForces()
    d.fx = null;
    d.fy = null;
  });

//force for the simulation
function boundingBox() {
  let rad
  let curr_node
  for (curr_node of nodes) {
    rad = radius(curr_node, should_have_halo(curr_node))
    curr_node.x = Math.max(rad + margin.left, Math.min(width - rad - margin.right, curr_node.x));
    curr_node.y = Math.max(rad + margin.top, Math.min(height - rad - margin.bottom, curr_node.y));
  }
}

function allowed_nodes(d) {
  return d.appearances >= min_size
}

function allowed_links(d) {
  return d.target.appearances >= min_size && d.source.appearances >= min_size
}

//called each tick
function updateAllowedUsers() {
  //only users represented in distance slider
  filter.allowedUsers = filter.sliderUsers.slice(0, document.querySelector("#filterSlider").value)
  //now by user checkboxes
  if (filter.checkBoxUsers.length) {
    const acceptedUsers = []
    for (let user of filter.checkBoxUsers) {
      if (filter.allowedUsers.includes(user)) {
        acceptedUsers.push(user)
      }
    }
    filter.allowedUsers = acceptedUsers
  }
  //now by demographics
  document.querySelectorAll(".demographic").forEach((box) => {
    if (box.checked) {
      return
    }
    const acceptedUsers = []
    for (let user of filter.allowedUsers) {
      if (box.dataset.class != graph.data.users[user][box.dataset.category]) {
        acceptedUsers.push(user)
      }
    }
    filter.allowedUsers = acceptedUsers
  })
}

//returns the user list that the filter accepts
function filteredUsers(d) {
  allowedUsers = []
  for (let user of d.users) {
    if (filter.allowedUsers.includes(user)) {
      allowedUsers.push(user)
    }
  }
  return allowedUsers
}

function setClick(obj, d) {
  obj.onclick = () => {
    if (selectedNode == "Start" && node) {
      node.filter((d) => d.name == "Start")
        .selectAll('.opaque')
        .attr("fill", arrow_line_color)
    }
    selectedNode = d.name
    if (selectedNode == "Start" && node) {
      node.filter((d) => d.name == "Start")
        .selectAll('.opaque')
        .attr("fill", bold_line_color)
    }
    document.querySelector("#nodeInfo").style.backgroundColor = fadedColor(d)
    if (d.name == "Start") {
      document.querySelector("#nodeName").innerHTML = "Starting Point"
    } else if (d.score > 1) {
      document.querySelector("#nodeName").innerHTML = `Correct Answer: <b>${d.name}</b>`
    } else if (d.score < 0) {
      document.querySelector("#nodeName").innerHTML = "Gave Up"
    } else {
      document.querySelector("#nodeName").innerHTML = `Incorrect Answer: <b>${d.name}</b>`
    }

    document.querySelector("#nodeDistance").textContent = `Average Distance: ${d.distance}`
    const correct = Math.round(d.score * 100)
    if (correct >= 0 && correct <= 100) {
      //incorrect ans
      document.querySelector("#nodeCorrect").textContent = `Correct: ${Math.round(d.score * 100)}% (${Math.round(d.score * d.appearances)})`
    } else if (correct > 100) {
      //correct ans
      document.querySelector("#nodeDistance").textContent = ""
      document.querySelector("#nodeCorrect").textContent = "Correct Answer"
    } else {
      //gave up
      document.querySelector("#nodeCorrect").textContent = "Correct: 0% (0)"
    }
    document.querySelector("#nodeAppearances").textContent = `Occurrences: ${d.appearances}`
    document.querySelector("#splitNodes").style.visibility = d.mergeList.length < 2 ? 'hidden' : 'initial'
    updateUserList(d)
    //Check to handle empty lesson
    if (d.appearances > 0) {
      simulation.restart()
    } else {
      if (confirm(`Looks like nobody has attempted this lesson yet... Want to go back?`)) {
        window.history.back()
      }
      simulation.stop()
      svg.remove()
    }
  };
  if (d.name == "Start") {
    obj.onclick()
  }
}

const userList = document.querySelector("#userList")

function initializeUserList() {
  //set up buttons
  document.querySelector("#selectClear").onclick = () => {
    clearAllUserChecks(false)
  }
  document.querySelector("#selectAll").onclick = () => {
    selectAllUserChecks(true)
  }
  let userString = ""
  for (let user of Object.entries(graph.data.users)) {
    userString += `<div><input type="checkbox" id="${user[0]}">
          <label for="${user[0]}" style="display: block"></label></div>`
  }
  userList.innerHTML = userString.substring(0, userString.length - 6)
  userList.querySelectorAll("input").forEach((element) => element.onclick = setCheckBoxFilter)
  document.querySelectorAll(".demographic").forEach(element => element.oninput = simulation.restart)
}

function updateUserList(d) {
  const inputs = userList.querySelectorAll("input")
  inputs.forEach((element) => {
    element.style.display = "none"
  })
  userList.querySelectorAll("label").forEach((element) => {
    element.style.display = "none"
  })
  //count users
  let userMap = new Map()
  for (let user of d.users) {
    if (!userMap.has(user)) {
      userMap.set(user, 1)
    } else {
      userMap.set(user, userMap.get(user) + 1)
    }
  }
  inputs.forEach((element) => {
    for (let user of userMap) {
      if (user[0] == element.id) {
        //show!
        element.style.display = "initial"
        const label = userList.querySelector(`label[for="${element.id}"]`)
        label.style.display = "initial"
        //handle multiple occurrences
        if (user[1] > 1) {
          label.textContent = `${graph.data.users[user[0]].name} (${user[1]})`
        } else {
          label.textContent = graph.data.users[user[0]].name
        }
        return
      }
    }
  })
}

function disableSimulationForces() {
  simulation
    .force("link", null)
    .force("charge", null)
    .force("collision", null)
    .force("yVal", null)
    .force("xVal", null)
    .force("bBox", null)
}

function enableSimulationForces() {
  simulation
    .nodes(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(0.005 / (scalingFactor ** 0.6)))
    .force("charge", d3.forceManyBody().strength(-120 * (scalingFactor ** 0.4)))
    .force("collision", d3.forceCollide(radius))
    .force("xVal", d3.forceX(xForce).strength(0.7))
    .force("yVal", d3.forceX(height / 2).strength(.02 / (scalingFactor ** 0.4)))
    .force("bBox", boundingBox)
}

function xForce(d) {
  return d.height * (width - margin.left - margin.right - largest - largest) + margin.left + largest
}

function initializeSlider() {
  const filterSlider = document.querySelector("#filterSlider")
  filterSlider.min = 1
  filterSlider.value = filterSlider.max = Object.entries(graph.data.users).length
  filterSlider.oninput = () => {
    simulation.restart()
  }
}

function listCollisions(id, circle) {
  let collidedWith = []
  node
    .each(function (d) {
      if (d.id === id) {
        return
      }
      if (d.appearances < min_size) {
        return
      }
      const otherRadius = radius(d)
      const distance = ((d.x - circle.x) ** 2 + (d.y - circle.y) ** 2) ** (1 / 2)
      //check for circles colliding
      if (-Math.abs(circle.r - otherRadius) < distance && distance < circle.r + otherRadius) {
        collidedWith.push(this)
      }
    })
  return collidedWith
}

function initializeMergeList(d) {
  d.mergeList = [d.id]
}

function initializeSplitButton() {
  document.querySelector("#splitNodes").onclick = () => {
    for (let node of document.querySelectorAll(".node")) {
      if (node.__data__.name === selectedNode) {
        unMerge(node)
        return
      }
    }
  }
}

function findNode(id) {
  return merged.get(id) || id
}

/**
 * Merges index 1 into index 0, deletes index 1, then recurses
 * @param toMerge 
 */
function mergeNodes(toMerge) {
  if (checkIllegalMerge(toMerge[0], toMerge[1], true)) {
    return
  }
  connectNodes(toMerge[1], toMerge[0])
  connectLinks(toMerge[1], toMerge[0])
  toMerge[0].__data__.mergeList.push(...toMerge[1].__data__.mergeList)
  // click on the new one and refresh its color, add a dashed stroke to let the user know it's been messed with
  toMerge[0].onclick()
  resetPreview(toMerge[0])
  d3.select(toMerge[0]).selectAll(".opaque, .translucent").attr("fill", color)
  d3.select(toMerge[0]).select(".opaque").attr("stroke", border_color).attr("stroke-dasharray", "5, 3")
  return
}

function unMerge(toSplit) {
  const newNodesList = toSplit.__data__.mergeList
  //get rid of redirects
  for (let id of newNodesList) {
    merged.delete(id)
  }
  const xCenter = toSplit.__data__.x
  const yCenter = toSplit.__data__.y
  //Delete the old
  d3.select(toSplit).remove()
  removeEdges(toSplit.__data__)
  //Remake the new
  //Get the data of the old nodes
  const nodeDataArray = []
  originalNodes.forEach((node, index) => {
    if (newNodesList.includes(node.id)) {
      nodeDataArray.push(nodes[index] = JSON.parse(JSON.stringify(node)))
      nodes[index].x = xCenter
      nodes[index].y = yCenter
      nodes[index].vx = nodes[index].vy = 0
    }
  })
  addNewEdges(newNodesList)
  addnewNodes(nodeDataArray, true)
  sortZOrder()
  simulation.alpha(.15).alphaTarget(0).restart()
  enableSimulationForces()
  for (let node of svg_node.querySelectorAll(".node")) {
    if (node.__data__.id === newNodesList[0]) {
      node.onclick()
      break
    }
  }
}

function removeEdges(nodeData) {
  link
    .each(function (d) {
      if (d.source === nodeData || d.target === nodeData) {
        d3.select(this).remove()
      }
    })
}

function addnewNodes(nodeDataArray, reInitMergeList) {
  const newNodes = svg.selectAll()
    .data(nodeDataArray)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("style", "cursor: pointer;")
    .each(function (d) {
      if (reInitMergeList) {
        initializeMergeList(d)
      }
      setClick(this, d)
    })
    .call(drag)

  newNodes.append("title")
    .html(d => d.name)

  // Make haloes
  newNodes.filter(should_have_halo)
    .append('circle')
    .attr('r', d => radius(d, true))
    .attr("fill-opacity", 0)
    .attr("stroke", border_color)
    .attr("stroke-width", 1)
    .attr('class', 'halo')

  newNodes.append("circle")
    .attr("r", d => radius(d))
    .attr("fill", color)
    .attr("opacity", d => (d.name == "Start") ? 0.05 : 0.1)
    .attr("class", "translucent")

  newNodes.append("circle")
    .attr("r", radius)
    .attr("fill", color)
    .attr("stroke", border_color)
    .attr("stroke-width", 1)
    .attr("class", "opaque")

  newNodes.filter((d) => d.name == "Start")
    .append("circle")
    .attr("r", d => radius(d) * 3 / 4)
    .attr("fill", background_color)
    .attr("class", "opaque-smaller")

  newNodes.append("text")
    .attr('display', 'none')
    .attr('class', 'answer-label')
    .attr('text-anchor', 'middle')
    .attr('dy', d => `-${radius(d)}`)
    .attr('style', `font-size: ${scalingFactor * textFactor}rem`)
    .attr('filter', 'url(#solidFilter)')
    .html(d => d.name) // here

  newNodes.append("circle")
    .attr("r", minSize - center_offset)
    .attr("stroke-width", 0)
    .attr("fill", "white")
    .attr("class", "center")

  newNodes.append("circle")
    .attr("r", minSize - center_offset - mini_center_offset)
    .attr("stroke-width", 0)
    .attr("fill", opposite_background_color)
    .attr("class", "center")

  node = svg.selectAll(".node")
  updateLargest(node)
  updateAnswerLabels()
}

function updateLargest(nodes) {
  largest = 0
  nodes.filter(d => d.name != "Start").each((d) => {
    const rad = radius(d, should_have_halo(d))
    if (rad > largest) {
      largest = rad
    }
  })
  enableSimulationForces()
}

function addNewEdges(nodeIDArray) {
  const linkDataArray = []
  originalLinks.forEach((link, index) => {
    if (nodeIDArray.includes(link.source) || nodeIDArray.includes(link.target)) {
      linkDataArray.push(links[index] = JSON.parse(JSON.stringify(link)))
      links[index].source = findNode(links[index].source)
      links[index].target = findNode(links[index].target)
    }
  })
  const newLinks = svg.selectAll()
    .data(linkDataArray)
    .enter()
    .append("g")
    .attr("fill", "none")
    .attr("class", "link")
    .attr("stroke", arrow_line_color)

  newLinks
    .append("path")
    .attr("class", "translucent")
    .attr("stroke-width", link_width)
    .attr("opacity", 0.1)

  newLinks
    .append("path")
    .attr("class", "opaque")

  link = svg.selectAll(".link")
}

function checkIllegalMerge(merge1, merge2, interrupt) {
  //check for gave up
  if (merge1.__data__.score == -1 || merge2.__data__.score == -1) {
    if (interrupt) {
      alert(`Sorry, you can't merge the special "Gave up" node with anything else!`)
      resetPreview(merge1)
      resetPreview(merge2)
    }
    return true
  }
  //check for start
  if (merge1.__data__.name === "Start" || merge2.__data__.name === "Start") {
    if (interrupt) {
      alert(`Sorry, you can't merge the special "Start" node with anything else!`)
      resetPreview(merge1)
      resetPreview(merge2)
    }
    return true
  }
  //check for incorrect/correct merging
  if (Math.sign(merge1.__data__.score - 1.5) != Math.sign(merge2.__data__.score - 1.5)) {
    if (interrupt) {
      alert(`Sorry, you can't merge incorrect and correct nodes together!`)
      resetPreview(merge1)
      resetPreview(merge2)
    }
    return true
  }
  return false
}

function connectNodes(toDelete, parent) {
  const childData = toDelete.__data__
  const parentData = parent.__data__
  parentData.name += `, ${childData.name}`
  //weighted averages
  parentData.height = (parentData.height * parentData.appearances + childData.height * childData.appearances) / (parentData.appearances + childData.appearances)
  //only run for incorrect nodes
  if (parentData.score != 2) {
    if (!isNaN(parentData.distance) && !isNaN(childData.distance)) {
      parentData.distance = Math.round((parentData.distance * parentData.appearances + childData.distance * childData.appearances) * 100 / (parentData.appearances + childData.appearances)) / 100
    } else if (!isNaN(childData.distance)) {
      parentData.distance = childData.distance
    }
    parentData.score = Math.round((parentData.score * parentData.appearances + childData.score * childData.appearances) * 100 / (parentData.appearances + childData.appearances)) / 100
  }
  parentData.appearances += childData.appearances
  parentData.users = parentData.users.concat(childData.users)
  //delete old node
  d3.select(toDelete).remove()
  d3.select(parent).remove()
  addnewNodes([parentData])
}

function connectLinks(toDelete, parent) {
  //set up merged redirects
  for (let id of toDelete.__data__.mergeList) {
    merged.set(id, parent.__data__.id)
  }
  link
    .each(function (d) {
      //check if something interesting should happen
      if (d.source === toDelete.__data__) {
        //link was coming from the merged node
        d.source = parent.__data__
      } else if (d.target === toDelete.__data__) {
        //link was going to the merged node
        d.target = parent.__data__
      } else {
        return
      }
      //something interesting already happened!
      if (d.target === d.source) {
        //don't want this!
        d3.select(this).remove()
        link = d3.selectAll(".link")
        return
      }
      //check to see if there are duplicate links now
      const me = this
      link
        .each(function (otherD) {
          if (this === me) {
            return
          }
          if (d.source === otherD.source && d.target === otherD.target) {
            //duplicates, needs a merge
            //delete one of the links
            d3.select(me).remove()
            link = d3.selectAll(".link")
            //merge the users
            otherD.users = otherD.users.concat(d.users)
          }
        })
    })
}

function mergePreview(node, dragged) {
  if (checkIllegalMerge(node, dragged)) {
    d3.select(node).selectAll(".preview").remove()
    d3.select(node)
      .append("circle")
      .attr("r", previewRadius(node, dragged))
      .attr("fill", "none")
      .attr("class", "preview")
      .attr("stroke", bad_wrong_answer_color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5, 3")
    return
  }
  d3.select(node).selectAll(".preview").remove()
  d3.select(node)
    .append("circle")
    .attr("r", previewRadius(node, dragged))
    .attr("fill", "none")
    .attr("class", "preview")
    .attr("stroke", border_color)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5, 3")
}

function previewRadius(node, dragged) {
  return radiusHelper(node.__data__.appearances + dragged.__data__.appearances)
}

function resetPreview(node) {
  d3.select(node).selectAll(".preview").remove()
}

function sortZOrder() {
  svg.selectAll(".node, .link").sort((a, b) => {
    if (a.target || !b.target) {
      return -1
    }
    if (!a.target || b.target) {
      return 1
    }
    return 0
  })
}

function clearAllUserChecks() {
  userList.querySelectorAll("input").forEach((element) => {
    element.checked = false
  })
  setCheckBoxFilter()
}

function selectAllUserChecks() {
  let foundUnchecked = false
  userList.querySelectorAll("input").forEach((element) => {
    if (element.style.display != "none") {
      if (!element.checked) {
        foundUnchecked = true
      }
    }
  })
  if (!foundUnchecked) {
    userList.querySelectorAll("input").forEach((element) => {
      if (element.style.display != "none") {
        element.checked = false
      }
    })
    setCheckBoxFilter()
    return
  }
  userList.querySelectorAll("input").forEach((element) => {
    if (element.style.display != "none") {
      element.checked = true
    }
  })
  setCheckBoxFilter()
}

function setCheckBoxFilter() {
  filter.checkBoxUsers = []
  userList.querySelectorAll("input").forEach((element) => {
    if (element.checked) {
      filter.checkBoxUsers.push(element.id)
    }
  })
  simulation.restart()
}

function is_selected(d) {
  return selectedNode == d.name
}

function boldLine(d) {
  if (selectedNode == d.source.name || selectedNode == d.target.name) {
    d3.select(this)
      .attr("stroke", bold_line_color)
  } else {
    d3.select(this)
      .attr("stroke", arrow_line_color)
  }
}

function manageOpaqueLink(d) {
  const users = filteredUsers(d).length
  if (users > 0) {
    d3.select(this)
      .attr("stroke-width", link_width_helper(users))
      .attr("marker-end", "url(#OpaqueTriangle")
  } else {
    d3.select(this)
      .attr("stroke-width", 0)
      .attr("marker-end", "url(#TranslucentTriangle")
  }
}

function link_width(d) {
  return link_width_helper(d.size)
}

function link_width_helper(num_users) {
  return (num_users ** 0.5) * min_link_width
}

function should_have_halo(d) {
  return (d.name == "Start") || (d.name == "Gave Up") || (d.distance < 1)
}

function radius(d, is_halo) {
  return radiusHelper(d.appearances, is_halo)
}

function radiusHelper(appearances, is_halo) {
  if (appearances <= 0) {
    return 0
  }
  const offset = is_halo ? halo_offset : 0
  return appearances ** 0.5 * minSize + offset
}

function color(d) {
  if (d.name == "Gave Up") {
    return gave_up_color
  }
  if (d.distance == "No completions") {
    return bad_wrong_answer_color
  }
  if (d.name == "Start") {
    if (selectedNode == d.name) {
      return bold_line_color
    }
    return arrow_line_color
  }
  if (d.distance < 1) {
    return right_answer_color
  }
  const goodness = (maxDistance - (d.distance - 1) ** 0.7) / (maxDistance)
  return fade_color(bad_wrong_answer_color, good_wrong_answer_color, goodness)
}

function fade_color(from, to, how_much) {
  const inverse = 1 - how_much
  const [from_red, from_green, from_blue] = hex_string_to_nums(from)
  const [to_red, to_green, to_blue] = hex_string_to_nums(to)

  return `#${fade_one_color(from_red, to_red, how_much, inverse)}${fade_one_color(from_green, to_green, how_much, inverse)}${fade_one_color(from_blue, to_blue, how_much, inverse)}`
}

function fade_one_color(from, to, how_much, inverse) {
  let hex_code = Math.floor(from * inverse + to * how_much).toString(16)
  if (hex_code.length < 2) {
    hex_code = "0" + hex_code
  }
  return hex_code
}

function hex_string_to_nums(hex_string) {
  const red = hex_string.substring(1, 3)
  const green = hex_string.substring(3, 5)
  const blue = hex_string.substring(5, 7)
  return [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)]
}


function fadedColor(d) {
  const [red, green, blue] = hex_string_to_nums(color(d))
  return `rgba(${red},${green},${blue},0.2)`
}

function black_or_white(d) {
  const colors = hex_string_to_nums(color(d))
  const lightness = (Math.max(...colors)) / 255
  return lightness > 0.7 ? "#000000" : "#ffffff"
}

let answer_count = 0
let max = 0
graph.data.nodes.forEach((n) => {
  answer_count += n.appearances
  if (n.appearances > max) {
    max = n.appearances
  }
})

const scalingFactor = (answer_count / 165) ** 0.5

let min_size = 1
// set the dimensions of graph, data
const viewbox = svg_node.getAttribute('viewBox')
const [x1, y1, x2, y2] = viewbox.split(' ')
const width = (x2 - x1) * scalingFactor
const height = width * 585 / 1040
const margin = {
  "left": 50 / 1040 * width,
  "right": 50 / 1040 * width,
  "top": 50 / 1040 * width,
  "bottom": 50 / 1040 * width
}


svg.attr('viewBox', `0, 0, ${width}, ${height}`)

let links = graph.data.links
//Filter loops
links.forEach((link, index) => {
  if (link.source == link.target) {
    links.splice(index, 1)
  }
})
let nodes = graph.data.nodes
nodes.sort((a, b) => {
  if (!Number.isNaN(Number.parseFloat(a.distance))) {
    if (!Number.isNaN(Number.parseFloat(b.distance))) {
      //normal case
      if (Number.parseFloat(b.distance) - Number.parseFloat(a.distance) != 0) {
        return Number.parseFloat(b.distance) - Number.parseFloat(a.distance)
      } else {
        //Tied in distance, make more often nodes lower
        return a.appearances - b.appearances
      }
    }
    //b is a no completions, "infinite" distance
    return 1
  }
  //a is no completions
  if (!Number.isNaN(Number.parseFloat(b.distance))) {
    return -1
  }
  //Both are no completions, check to see if one is gave up node
  if (a.score < 0) {
    return -1
  } else if (b.score < 0) {
    return 1
  } else {
    //neither are gave up, make more often nodes lower
    return a.appearances - b.appearances
  }
})
// Preferred x-value
const length = nodes.length - 1
let maxDistance = 0
nodes.forEach((node, index) => {
  if (!Number.isNaN(Number.parseFloat(node.distance))) {
    if (Number.parseFloat(node.distance) > maxDistance) {
      maxDistance = Number.parseFloat(node.distance)
    }
  }
  node.height = index / length
  node.x = node.height * (width - margin.left - margin.right) + margin.left
  node.y = height / 2 + (0.5 - Math.random()) * (height * 0.7)
})
maxDistance--
maxDistance = maxDistance ** 0.7
if (maxDistance <= 0) { //corner case for lessons corrupted by alternates
  maxDistance = 1
}
const originalNodes = JSON.parse(JSON.stringify(nodes))
const originalLinks = JSON.parse(JSON.stringify(links))
// forces
const simulation = d3.forceSimulation()

enableSimulationForces()


//Had to wait until simulation was created for these so they can tell the simulation to restart
initializeUserList()
initializeSlider()
initializeSplitButton()

let link = svg.selectAll(".link")
  .data(links)
  .enter()
  .append("g")
  .attr("fill", "none")
  .attr("class", "link")
  .attr("stroke", arrow_line_color)

link
  .append("path")
  .attr("class", "translucent")
  .attr("stroke-width", link_width)
  .attr("opacity", 0.1)

link
  .append("path")
  .attr("class", "opaque")

let node
addnewNodes(nodes, true)
set_up_color_key()

let min = 2
const middle = Math.floor(max / 2)
if (min == middle) {
  min = 1
}
set_up_size_key([min, middle, max])

simulation.on("tick", () => {
  updateAllowedUsers()
  node
    .attr("display", d => allowed_nodes(d) ? "initial" : "none")
    .attr("transform", d => `translate(${d.x}, ${d.y})`)
    .selectAll(".opaque")
    .attr("r", d => radiusHelper(filteredUsers(d).length))

  node
    .selectAll(".opaque-smaller")
    .attr("r", d => radiusHelper(filteredUsers(d).length) * 5 / 6)

  node
    .selectAll('.halo')
    .attr('r', d => radiusHelper(filteredUsers(d).length, true))

  node
    .selectAll(".center")
    .attr("visibility", d => is_selected(d) ? 'visible' : 'hidden')

  node
    .selectAll('.answer-label')
    .attr("font-weight", d => is_selected(d) ? 700 : 400)
    .attr("opacity", d => (filteredUsers(d).length > 0) ? 1 : 0.1)

  link
    .selectAll("path")
    .attr("display", d => allowed_links(d) ? "initial" : "none")
    .attr("d", d => {
      const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x)
      const distance = Math.sqrt((d.target.x - d.source.x) ** 2 + (d.target.y - d.source.y) ** 2)
      const rightAngle = angle + Math.PI / 2
      const middleX = (d.target.x + d.source.x) / 2 + Math.cos(rightAngle) * curve * distance
      const middleY = (d.target.y + d.source.y) / 2 + Math.sin(rightAngle) * curve * distance

      let sourceRad = radiusHelper(filteredUsers(d.source).length)
      sourceRad = (sourceRad == 0) ? radius(d.source) : sourceRad
      const mid_to_source_angle = Math.atan2(d.source.y - middleY, d.source.x - middleX)
      const source_rad_adjusted = sourceRad + (should_have_halo(d.source) ? halo_offset : 0)
      const sourceX = d.source.x - Math.cos(mid_to_source_angle) * source_rad_adjusted
      const sourceY = d.source.y - Math.sin(mid_to_source_angle) * source_rad_adjusted

      let targetRad = radiusHelper(filteredUsers(d.target).length)
      targetRad = (targetRad == 0) ? radius(d.target) : targetRad
      const mid_to_target_angle = Math.atan2(d.target.y - middleY, d.target.x - middleX)
      const target_rad_adjusted = targetRad + arrow_padding_offset + (should_have_halo(d.target) ? halo_offset : 0)
      const targetX = d.target.x - Math.cos(mid_to_target_angle) * target_rad_adjusted
      const targetY = d.target.y - Math.sin(mid_to_target_angle) * target_rad_adjusted
      return `M ${sourceX} ${sourceY} Q ${middleX} ${middleY} ${targetX} ${targetY}`
    })
    .each(boldLine)

  link
    .selectAll(".opaque")
    .each(manageOpaqueLink)
})


function reload_colors() {
  svg.attr('style', `background-color: ${background_color}`)

  node
    .selectAll('.translucent, .opaque')
    .attr('fill', d => color(d))

  newNodes
    .selectAll('.opaque')
    .attr('fill', fade_color(good_wrong_answer_color, bad_wrong_answer_color, 0.5))

  for (let node of document.querySelectorAll(".node")) {
    if (node.__data__.name === selectedNode) {
      document.querySelector("#nodeInfo").style.backgroundColor = fadedColor(node.__data__)
      break
    }
  }
  set_up_color_key()
}

function updateAnswerLabels(display) {
  if (display != null) {
    node.selectAll('.answer-label')
      .attr('display', display ? 'initial' : 'none')
    displayingLabels = display
  } else {
    updateAnswerLabels(!displayingLabels)
    updateAnswerLabels(!displayingLabels)
  }
}

function set_up_size_key(sizes) {
  sizes.sort((a, b) => a < b ? -1 : 1)

  const key_height = Math.max(radiusHelper(sizes[sizes.length - 1]) * 2 * (1.4), 50)

  const graph_width = svg_node.clientWidth
  const my_width = document.querySelector("#nodeInfo").clientWidth
  const key_width = width * my_width / graph_width

  const nodeDataArray = []
  for (let i = 0; i < sizes.length; i++) {
    nodeDataArray.push({
      name: `${sizes[i]}`,
      appearances: sizes[i],
      x: ((i + 0.5) * (key_width / sizes.length)),
      y: (key_height / 2)
    })
  }

  const key = d3.select("#sizeKey")
  key.attr('viewBox', `0, 0, ${key_width}, ${key_height}`)

  newNodes = key.selectAll()
    .data(nodeDataArray)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x}, ${d.y})`)

  newNodes.append("title")
    .html(d => d.name)

  newNodes.append("circle")
    .attr("r", d => radius(d))
    .attr("fill", fade_color(good_wrong_answer_color, bad_wrong_answer_color, 0.5))
    .attr("stroke", border_color)
    .attr("stroke-width", 1)
    .attr("class", "opaque")

  newNodes.append("text")  // here
    .attr('class', 'answer-label')
    .attr('text-anchor', 'middle')
    .attr('dy', d => `-${radius(d)}`)
    .attr('filter', 'url(#solidFilter)')
    .attr("style", `font-size: ${scalingFactor * textFactor}rem`)
    .html(d => d.name)

  key.attr('style', 'display: initial')
}

function set_zoom(zoom_out) {
  if (zoom_out) {
    if (min_size == 1) {
      return
    } else {
      min_size = get_max_size_not_shown()
    }
  } else {
    new_min_size = get_min_size_shown_above_min_size()
    if (new_min_size) {
      min_size = new_min_size
    }

  }

  // Button opacity
  if (get_max_size_not_shown()) {
    zoomOut.classList.remove("inactive")
  } else {
    zoomOut.classList.add("inactive")
  }
  if (get_min_size_shown_above_min_size()) {
    zoomIn.classList.remove("inactive")
  } else {
    zoomIn.classList.add("inactive")
  }

  simulation.restart()
}

function get_min_size_shown_above_min_size() {
  let record_min_size = false
  for (const node of svg_node.querySelectorAll(".node")) {
    if (node.__data__.appearances > min_size) {
      if (!record_min_size) {
        record_min_size = node.__data__.appearances
      } else {
        record_min_size = Math.min(record_min_size, node.__data__.appearances)
      }
    }
  }
  return record_min_size
}

function get_max_size_not_shown() {
  let record_max_size = false
  for (const node of svg_node.querySelectorAll(".node")) {
    if (node.__data__.appearances < min_size) {
      if (!record_max_size) {
        record_max_size = node.__data__.appearances
      } else {
        record_max_size = Math.max(record_max_size, node.__data__.appearances)
      }
    }
  }
  return record_max_size
}