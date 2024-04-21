import json
import os
from pathlib import Path
from zipfile import ZipFile

from flask import Flask, render_template, request, url_for

import extract_all_data
import extract_all_data_220
import parsons_extract_all_data


PYTHONANYWHERE_DIR = ''
UPLOAD_FOLDER = PYTHONANYWHERE_DIR + 'uploads'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/')
def index():
    return render_template('index.html')


def get_all_tags():
    tags = set()
    with open(PYTHONANYWHERE_DIR + 'db.txt') as f:
        for line in f:
            tags.add(line.strip().split('|')[-1])
    
    return tags


@app.route('/override', methods=["GET", "POST"])
def override():
    if request.method == "GET":
        return render_template('zip_file_upload.html', tags=get_all_tags(), mode='overriding all current data')

    if 'folder' not in request.files:
        return 'error cannot find file'

    file = request.files['folder']

    dir = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(dir)

    course = request.form['coursename']
    tag = request.form['tag']

    if course == '230':
        extract_all_data.clean_up_data_directory()
        data_folder_after_massage = extract_all_data.massage(file.filename)
        extract_all_data.extract_stuff(data_folder_after_massage, tag)

    elif course == '220':
        extract_all_data_220.clean_up_data_directory()
        data_folder_after_massage = extract_all_data_220.massage(file.filename)
        extract_all_data_220.extract_stuff(data_folder_after_massage, tag)

    with open(PYTHONANYWHERE_DIR + 'used_assignments.json', 'w') as json_file:
        json.dump({"used": [Path(file.filename).stem]}, json_file)

    return render_template('message.html', message='Done', link_name='Data page', url=url_for('index_page_for_data'))


def assignment_already_exists(upload_name):
    # Assuming same assignments are in the same ZIP-folders
    with open(PYTHONANYWHERE_DIR + 'used_assignments.json') as db_file:
        return upload_name in json.load(db_file)['used']


@app.route('/add', methods=['GET', 'POST'])
def add():
    if request.method == "GET":
        return render_template('zip_file_upload.html', tags=get_all_tags(), mode='adding new data')

    if 'folder' not in request.files:
        return 'error cannot find file'

    file = request.files['folder']
    file_without_extension = Path(file.filename).stem

    dir = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(dir)

    course = request.form['coursename']
    tag = request.form['tag']

    if assignment_already_exists(file_without_extension):
        return render_template(
            'message.html', 
            message='The folder with this name already exists in the system. Sorry for the inconveniece',
            link_name='Load another one?', url=url_for('add'))

    if course == '230':
        data_folder_after_massage = extract_all_data.massage(file.filename)
        extract_all_data.extract_stuff(data_folder_after_massage, tag, override=False)

    elif course == '220':
        data_folder_after_massage = extract_all_data_220.massage(file.filename)
        extract_all_data_220.extract_stuff(data_folder_after_massage, tag, override=False)


    with open(PYTHONANYWHERE_DIR + 'used_assignments.json') as json_file:
        used_assignments = json.load(json_file)
    used_assignments['used'].append(file_without_extension)
    with open(PYTHONANYWHERE_DIR + 'used_assignments.json', 'w') as json_file:
        json.dump(used_assignments, json_file)

    return render_template('message.html', message='Done', link_name='Data page', url=url_for('index_page_for_data'))


@app.route('/data')
def index_page_for_data():
    links = []
    with open(PYTHONANYWHERE_DIR + 'db.txt') as file:
        for line in file.readlines():
            splitted_line = line.strip().split('|')
            links.append([splitted_line[0], splitted_line[-1]])

    return render_template('index_data.html', links=links, tags=get_all_tags())


@app.route('/task/<task_name>')
def see_graph_for_task(task_name):
    graph_data = ""
    with open(PYTHONANYWHERE_DIR + 'db.txt') as file:
        for line in file.readlines():
            if line.split('|')[0] == task_name:
                graph_data = line.split('|')[1].strip()

    return render_template('graph.html', table=graph_data)


@app.route('/parsons')
def parsons_index():
    return render_template('parsons.html')


@app.route('/parsons/add', methods=['GET', 'POST'])
def parsons_add():
    if request.method == "GET":
        return render_template('parsons_zip_file_upload.html')

    if 'file' not in request.files:
        return 'error cannot find file'

    file = request.files['file']

    dir = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(dir)

    # assignment_exists, assignment_name = assignment_already_exists(dir, file.filename)
    # if assignment_exists:
    #     return 'assignment already exists. <a href="/parsons/add">add another one?</a>'

    parsons_extract_all_data.extract_stuff(file.filename, app.config['UPLOAD_FOLDER'], override=False)

    # with open(PYTHONANYWHERE_DIR + 'used_assignments.json') as json_file:
    #     used_assignments = json.load(json_file)
    # used_assignments['used'].append(assignment_name)
    # with open(PYTHONANYWHERE_DIR + 'used_assignments.json', 'w') as json_file:
    #     json.dump(used_assignments, json_file)

    return 'done <a href="/parsons/data">Data page</a>'


@app.route('/parsons/data')
def parsons_data():
    links = []
    with open(PYTHONANYWHERE_DIR + 'parson_db.txt') as file:
        for line in file.readlines():
            links.append(line.split('|')[0])

    return render_template('parsons_data.html', links=links)


@app.route('/parsons/task/<task_name>')
def see_graph_for_parsons_task(task_name):
    graph_data = ""
    with open(PYTHONANYWHERE_DIR + 'parson_db.txt') as file:
        for line in file.readlines():
            if line.split('|')[0] == task_name:
                graph_data = line.split('|')[1].strip()

    return render_template('graph.html', table=graph_data)


@app.route('/parsons/task/<task_name>/alternative')
def see_alternative_graph_for_parsons_task(task_name):
    graph_data = ""
    with open(PYTHONANYWHERE_DIR + 'parson_db.txt') as file:
        for line in file.readlines():
            if line.split('|')[0] == task_name:
                graph_data = line.split('|')[1].strip()

    return render_template('alternative_graph.html', table=graph_data)


if __name__ == "__main__":
    app.run(debug=True)
