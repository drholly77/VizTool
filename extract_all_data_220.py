import os
import shutil
import random
from pathlib import Path
from zipfile import ZipFile

import pandas as pd
import numpy as np


PYTHONANYWHERE_DIR = ''
DATA_BASE_FOLDER = PYTHONANYWHERE_DIR + 'DATA/data'


def work_on_zip_file(file):
    output = ""
    with ZipFile(file, 'r') as zipfolder:
        for file in zipfolder.filelist:
            output += file.filename

    return output


def clean_up_data_directory():
    #
    #
    #
    # add to the database used_assignments and erase it when overriding
    # copy thjis file to 220
    #
    #
    #    

    print(230)
    shutil.rmtree(PYTHONANYWHERE_DIR + 'DATA')
    Path(PYTHONANYWHERE_DIR + 'DATA').mkdir(parents=True, exist_ok=True)
    Path(PYTHONANYWHERE_DIR + 'DATA/data').mkdir(parents=True, exist_ok=True)
    Path(PYTHONANYWHERE_DIR + 'DATA/clean_after_massage').mkdir(parents=True, exist_ok=True)
    Path(PYTHONANYWHERE_DIR + 'DATA/clean_after_extract_all').mkdir(parents=True, exist_ok=True)


def massage(file):

    # PUT INSIDE ANOTHER FOLDER

    UPLOAD_DIR = os.path.abspath(PYTHONANYWHERE_DIR + 'uploads/' + file).replace("\\","/")

    original_folder_name = file[:-4]

    # extracting the assignment name
    outer_folder_name =  Path(file).stem
    
    # creating another layer (putting the stuff into another folder for the algorithm to correctly work)
    DATA_DIR = DATA_BASE_FOLDER + '/' + outer_folder_name

    print(DATA_DIR)

    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
    Path(PYTHONANYWHERE_DIR + 'DATA/clean_after_massage/' + outer_folder_name).mkdir(parents=True, exist_ok=True)

    with ZipFile(UPLOAD_DIR, 'r') as zipfile:
        zipfile.extractall(DATA_DIR + '/' + outer_folder_name)


    test_to_df = {}
    vals_seen = 0

    for assignment in os.listdir(DATA_DIR):
        for folder in os.listdir(f'{DATA_DIR}/{assignment}'):
            if folder.startswith('__') or 'MACOSX' in folder or 'MACOS' in folder:
                continue

            if not os.path.isdir(f'{DATA_DIR}/{assignment}/{folder}'):
                continue

            name = -1 # placeholder
            # warmup = 'warmupandstretching' in folder
            # if not warmup: # default
            #     name_start = folder.split(' ')[2:]
            #     name_start = '_'.join(name_start)
            #     # print(name_start)
            #     # print('hi')
            #     name = name_start[:name_start.index('-')-1]
            # else:
            #     # continue

            # TODO: URGENT: EDIT AS SOON AS I KNOW OTHER FOLDERS' STRUCTURE
            name = folder

            found_thing = False
            file_path = -1 # placeholder

            #
            # if not warmup:
            #     found_thing = False
            #     for f2 in os.listdir(f'{DATA_DIR}/{assignment}/{folder}'):
            #         if not os.path.isdir(f'{DATA_DIR}/{assignment}/{folder}/{f2}'):
            #             continue
            #         if found_thing:
            #             print("FOUND MULTIPLE RECORDS IN ONE STUDENT (bad)")
            #         found_thing = True
            #         file_path = f"{f2}/{get_fname(warmup)}"
            #     if not found_thing:
            #         print("FOUND NO RECORDS IN SOME STUDENT (bad)")
            # else:
            file_path = 'Attempt1_attachment/results.csv'


            print(f'{DATA_DIR}/{assignment}/{folder}/{file_path}')

            try:
                # TODO: Send a notice to the professor
                df = pd.read_csv(f'{DATA_DIR}/{assignment}/{folder}/{file_path}', header=None)
            except:
                continue

            vals_seen += df.shape[0]
            df['name'] = name
            df = df[['name',0,1,2]]
            for val in np.unique(df[0]):
                just_val = df[df[0] == val]
                just_val = just_val[['name',1,2]]
                val = f'{assignment}_{val}'
                if val not in test_to_df:
                    test_to_df[val] = just_val
                else:
                    # print("COMP")
                    # print(test_to_df[val])
                    # print(just_val)
                    test_to_df[val] = pd.concat([test_to_df[val], just_val])
                # print(val)
            # print(df)
    print(test_to_df)
    print(f"recorded things: {vals_seen}")
    for val in test_to_df:
        df = test_to_df[val]
        vals_seen -= df.shape[0]
        df.to_csv(PYTHONANYWHERE_DIR + f'DATA/clean_after_massage/{outer_folder_name}/{val}.csv', index=False, header=False)

    print(f"missed things (should be 0): {vals_seen}")

    return outer_folder_name


def extract_stuff(original_zip_folder_name, tag, override=True):
    # datafolder = 'clean_after_original_massage'   # changed from 'data'

    original_folder_name = original_zip_folder_name
    datafolder = PYTHONANYWHERE_DIR + 'DATA/clean_after_massage/' + original_folder_name
    cleanfolder = PYTHONANYWHERE_DIR + 'DATA/clean_after_extract_stuff/' + original_folder_name

    Path(cleanfolder).mkdir(parents=True, exist_ok=True)
    
    if override:
        with open(PYTHONANYWHERE_DIR + 'db.txt', 'w') as f:
            f.write('')

    NAME_CSV = PYTHONANYWHERE_DIR + 'names.csv'
    SPLIT = "SPLITHURTIG"
    global_names = []
    random.seed(32202+57)

    def nth_result(string, n):
        # print(string, n)
        if n == 0:
            return string[1]
        else:
            return nth_result(string[string.index(' ')+1:], n-1)

    def split_ans(string, n):
        split = []
        for t in string.split(' '):
            split.append(t[-1])

        if len(split) != n:
            split.append('C')
        while len(split) != n:
            split.append('S')
        #^^^^^?????^^^^^^^
        # TODO: If these are values standing for some ocnditions, such as critical error during test, consider changing them to avoid hardcoding

        return split

    def capture_names(df):
        return df.name.unique()

    def join_test(list_of_results):
        # Given: ['T', 'T', 'F', 'F', 'T']
        for i in range(1, len(list_of_results) + 1):
            list_of_results.insert(2 * (i - 1), f' {i}')

        return "".join(list_of_results)[1:]

    def clean_df(df):
        # anonymize

        df.name = df.name.apply(lambda n: global_names.index(n)).astype('int')
        df = df.sort_values('name', kind='stable')

        # handle missing testcases
        df['test_count'] = df.ans.str.count(' ') + 1
        m = max(df.test_count)       # finding max number of tests, should be equal to the mode
        if (m != df.test_count.mode()[0]):        # мода (самое частое значение), нужно чтобы понять крашнулся ли какой-то тест или нет
            ValueError("Nat made a bad assumption!") # Nat's assumption: we can get how many testcases there are by the mode AND the max.
                                                    # Nat doesn't want to pick one or the other until he's forced.


        df['tests'] = df.ans.apply(lambda s: split_ans(s, m))     # apply -> works like map, applies to all values
                                                                # split_ans(ans_column, number_of_tests)

        # df.tests is now clear data like TTFFTF
        # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        # TODO: нахера это вообще надо если результат такой же???????

        df.ans = df.tests.apply(join_test)     # пришли к тому же результату хз зачем

        # if you crashed, you don't get points. seems that something like
        # true then crash is counted as correct. rectifying.
        df['crashed'] = df.test_count != m
        df.correct = df.apply(lambda r: 0 if r.crashed else r.correct, axis=1)

        df['indexCol'] = df.index

        # DON'T drop everything before first non-all-false
        # all_wrong_ans = []
        # for i in range(1, m+1):
        #     all_wrong_ans.append(f'{i}F')
        # all_wrong_ans = ' '.join(all_wrong_ans)

        # TODO: seems like it potentially needs to be deleted because 0 correct answers is still the result case
        # TODO: Since the csv files are now different for each problem, it is possible to handle whether a student failed other problems because they only tried to work on the first one???????????????
        # group everything by name. For each student, find the first not-all-wrong answer. Only keep
        # the answers including and after that one.
        # old_df = df.copy()
        # df = df.groupby('name').apply(lambda g: g[g.indexCol >= (g[g.ans != all_wrong_ans])['indexCol'].min()])
        # print(df[df.name == min(df.name)])
        # print(old_df[old_df.name == min(old_df.name)])
        # print(df[df.ans == all_wrong_ans]['indexCol'].max())
        # input('sep>')
        df = df.reset_index(drop = True)

        df['indexCol'] = df.index

        # drop everything after getting first correct, only if correct was found
        df = df.groupby('name', group_keys=False).apply(lambda g: g[g.indexCol <= g.correct.idxmax()] if g.correct.max() == 1 else g)
        df = df.drop('indexCol', axis=1)

        # df = df.loc[(df.shift() != df).any(axis=1)] # drop consecutive duplicates

        df = df[['name', 'ans', 'correct']]
        return df

    # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    # Alex's assumption: cleaning all .html and .js files from the 'public' directory
    # Appears to be correct

    files_links = []


    # capture names
    for fname in sorted(os.listdir(datafolder)):
        if os.path.isdir(f'{datafolder}/{fname}'):
            continue
        global_names.extend(capture_names(pd.read_csv(f'{datafolder}/{fname}', header=None, names=['name', 'ans', 'correct'])))
    global_names = np.unique(global_names)
    random.shuffle(global_names)
    global_names = list(global_names)
    names_df = pd.DataFrame(data=global_names, columns=['name'])
    names_df['id'] = range(names_df.shape[0])
    names_df.to_csv(NAME_CSV, index=False)


    # Prerequisite:
    # What massage.py does is it splits all test cases apart
    # There was one csv with ALL problems in a lesson in the   data   folder
    # clean_data  now contains SIX FILES FOR EACH STUDENT

    for fname in sorted(os.listdir(datafolder)):
        if os.path.isdir(f'{datafolder}/{fname}'):
            continue

        files_links.append(fname.replace('.csv', ''))
        clean_df(
            pd.read_csv(
                f'{datafolder}/{fname}',
                header=None,
                names=['name', 'ans', 'correct']
            )
        ).to_csv(
            f'{cleanfolder}/{fname}', index=False, header=False)  # saving new cool dataframe to csv

        # What we got now is:
        # - anonymized name
        # - cleaned data (drop everything after all True's and drop every all False's)

        with open(PYTHONANYWHERE_DIR + 'db.txt', 'a') as file, open(f'{cleanfolder}/{fname}', 'r') as f:
            file.write(fname.replace('.csv', '') + "|" + ''.join(f.readlines()).replace('\n', SPLIT) + "|" + tag + '\n')


        """
        to_write = graph_reader_js_str.replace("window.sessionStorage.getItem('table')", "\"" + ''.join(f.readlines()).replace('\n', SPLIT) + "\"")
        to_replace = ".substring(table.indexOf('<tbody>') +  7)"
        to_write = to_write.replace(to_replace, "")
        g.write(to_write)
        f.close()
        g.close()
        g = open(f"{outpublic}/{fname.replace('.csv', '.html')}", 'w+')
        g.write(graph_str.replace("scripts/graph_reader/main_graph_reader.js", f"{fname.replace('.csv', '.js')}"))    # TODO: There SHOULD be a better way, no replaces
        g.close()
        # ^^^^^^^^^^^ Generating a JS and HTML file ^^^^^^^^^^
        """


    # TODO: There SHOULD BE A BETTER WAY, too
    # g = open(lesson_reader_path, 'r')
    # gstr = ''.join(g.readlines())
    # g.close()
    # gstr = gstr.replace('csv_text.split("\\r\\n")', f'csv_text.split("{SPLIT}")')
    # g = open(lesson_reader_path, 'w+')
    # g.write(gstr)
    # g.close()

    # TODO: Potentially, if switching to Flask, we may create a new file where we will write the links
    # Make the index.html extend that file
    # No need to .replace() anything since we will mess up if the text in the file changes
    # g = open(index_path, 'r')
    # gstr = ''.join(g.readlines())
    # g.close()
    # g = open(index_path, 'w+')
    # g.write(gstr.replace("Under construction! Check out the *data* page, then go to the *graph* page.", "\n".join(files_links)))
    # g.close()


    # TODO: Explore more this chunk of code. Potential hardcoding with 'Start' || 'Gave Up' .....
    # Changed so that the placeholder script contains that
    # TODO: Changes data visualization. Ask which one is better
    """
    g = open(d3_graph_js_path, 'r')
    gstr = ''.join(g.readlines())
    g.close()
    g = open(d3_graph_js_path, 'w+')
    g.write(gstr.replace(".attr('filter', 'url(#solidFilter)')\n    .html(d => d.name)", ".attr('filter', 'url(#solidFilter)')\n    .html(d => ((d.name == 'Start' || d.name == 'Gave Up') ? d.name : (d.name.match(/T/g) || []).length))"))
    g.close()
    """


    # TODO: I have no idea what this code does but it's now in the base file
    """
    g = open(sidenav_js_path, 'r')
    gstr = g.readlines()
    gstr.insert(81, "   labels.checked = 1\n")
    gstr = ''.join(gstr)
    g.close()
    g = open(sidenav_js_path, 'w+')
    g.write(gstr)
    g.close()
    """


'''
""" ORIGINAL_MASSAGE.PY """

import os
import pandas as pd
import numpy as np

DATA_DIR = 'data'
FNAME = 'results.csv'
FNAME_WARMUP = 'supportData.csv'

def get_fname(is_warmup):
    return FNAME_WARMUP if is_warmup else FNAME

test_to_df = {}
vals_seen = 0

for assignment in os.listdir(DATA_DIR):
    for folder in os.listdir(f'{DATA_DIR}/{assignment}'):
        if not os.path.isdir(f'{DATA_DIR}/{assignment}/{folder}'):
            continue
        # print("START")
        # print(folder)
        print(folder)
        name = -1 # placeholder
        warmup = 'warmupandstretching' in folder
        if not warmup: # default
            name_start = folder.split(' ')[2:]
            name_start = '_'.join(name_start)
            # print(name_start)
            # print('hi')
            name = name_start[:name_start.index('-')-1]
        else:
            # continue
            name = folder
            while '-' in name:
                name = name[name.index('-')+1:]
            print(name)

        found_thing = False
        file_path = -1 # placeholder
        if not warmup:
            found_thing = False
            for f2 in os.listdir(f'{DATA_DIR}/{assignment}/{folder}'):
                if not os.path.isdir(f'{DATA_DIR}/{assignment}/{folder}/{f2}'):
                    continue
                if found_thing:
                    print("FOUND MULTIPLE RECORDS IN ONE STUDENT (bad)")
                found_thing = True
                file_path = f"{f2}/{get_fname(warmup)}"
            if not found_thing:
                print("FOUND NO RECORDS IN SOME STUDENT (bad)")
        else:
            file_path = 'src/testSupport/supportData.csv'


        print(f'{DATA_DIR}/{assignment}/{folder}/{file_path}')

        try:
            # TODO: Send a notice to the professor
            df = pd.read_csv(f'{DATA_DIR}/{assignment}/{folder}/{file_path}', header=None)
        except:
            continue

        vals_seen += df.shape[0]
        df['name'] = name
        df = df[['name',0,1,2]]
        for val in np.unique(df[0]):
            just_val = df[df[0] == val]
            just_val = just_val[['name',1,2]]
            val = f'{assignment}_{val}'
            if val not in test_to_df:
                test_to_df[val] = just_val
            else:
                # print("COMP")
                # print(test_to_df[val])
                # print(just_val)
                test_to_df[val] = pd.concat([test_to_df[val], just_val])
            # print(val)
        # print(df)
# print(test_to_df)
print(f"recorded things: {vals_seen}")
for val in test_to_df:
    df = test_to_df[val]
    vals_seen -= df.shape[0]
    df.to_csv(f'clean_after_original_massage/{val}.csv', index=False, header=False)

print(f"missed things (should be 0): {vals_seen}")


""" EXTRACT_STUFF.PY """

import pandas as pd
import os
import shutil
import random

datafolder = 'clean_after_original_massage'   # changed from 'data'
cleanfolder = 'clean_after_extract_stuff'
inpublic = 'TEST_base_code_for_website'    # changed from 'independent-tool/public'
outpublic = 'site/public'
graph_path = 'site/public/graph.html'   # changed from 'independent-tool/public/graph.html'
index_path = 'site/public/index.html'
lesson_reader_path = f'{outpublic}/scripts/graph_reader/lesson_reader.js'
graph_reader_js_path = 'site/public/scripts/graph_reader/main_graph_reader.js'  # changed from 'independent-tool/public/scripts/graph_reader/main_graph_reader.js'
d3_graph_js_path = 'site/public/scripts/d3graph.js'
sidenav_js_path = 'site/public/scripts/sidenav.js'
SPLIT = "SPLITHURTIG"

def nth_result(string, n):
    # print(string, n)
    if n == 0:
        return string[1]
    else:
        return nth_result(string[string.index(' ')+1:], n-1)

def split_ans(string, n):
    split = []
    while len(string) >= 3:
        split.append(string[1])
        string = string[3:]
        # Extracting only T's and F's

    split.append(string[1])    # necessary because len(string) at the end is only 2
    if len(split) != n:
        split.append('C')
    while len(split) != n:
        split.append('S')
    #^^^^^?????^^^^^^^
    # TODO: If these are values standing for some ocnditions, such as critical error during test, consider changing them to avoid hardcoding

    return split

def join_test(list_of_results):
    # Given: ['T', 'T', 'F', 'F', 'T']
    for i in range(1, len(list_of_results) + 1):
        list_of_results.insert(2 * (i - 1), f' {i}')

    return "".join(list_of_results)[1:]

def clean_df(df):
    # anonymize
    # names = list(df.name.unique())
    # random.shuffle(names)
    # df.name = df.name.apply(lambda n: names.index(n)).astype('int')

    # old_name = df.name
    # df.name = df.name.apply(lambda n: hash(n) % 2000)
    # if len(old_name.unique()) != len(df.name.unique()):                               # ???????????????????
    #     raise ValueError("Different names hashed to the same thing!")
    df = df.sort_values('name')


    # TODO: ask about it
    """This chunk of code below caused problems, potentially Moodle API changed"""
    # print("Before trimming string:")
    # print(df.ans)
    # df.ans = df.ans.str[1:] # trim strings                    ????????????????????????
    # print("After trimming, before split_ans:")
    # print(df.ans)

    # handle missing testcases
    df['test_count'] = df.ans.str.count(' ') + 1
    m = max(df.test_count)       # finding max number of tests, should be equal to the mode
    if (m != df.test_count.mode()[0]):        # мода (самое частое значение), нужно чтобы понять крашнулся ли какой-то тест или нет
        ValueError("Nat made a bad assumption!") # Nat's assumption: we can get how many testcases there are by the mode AND the max.
                                                 # Nat doesn't want to pick one or the other until he's forced.


    df['tests'] = df.ans.apply(lambda s: split_ans(s, m))     # apply -> works like map, applies to all values
                                                              # split_ans(ans_column, number_of_tests)

    # print("After split_ans")
    # print(df.ans)


    # df.tests is now clear data like TTFFTF

    # print(df.tests)
    # print("Before join_test:", df.tests, sep='\n')

    # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    # TODO: нахера это вообще надо если результат такой же???????

    df.ans = df.tests.apply(join_test)     # пришли к тому же результату хз зачем

    # print("After join_test:", df.ans, sep='\n')
    # print("Aborting")
    # exit(12)


    # if you crashed, you don't get points. seems that something like
    # true then crash is counted as correct. rectifying.
    df['crashed'] = df.test_count != m
    df.correct = df.apply(lambda r: 0 if r.crashed else r.correct, axis=1)

    df['indexCol'] = df.index

    # drop everything before first non-all-false
    all_wrong_ans = []
    for i in range(1, m+1):
        all_wrong_ans.append(f'{i}F')
    all_wrong_ans = ' '.join(all_wrong_ans)
    # print(all_wrong_ans)

    # TODO: seems like it potentially needs to be deleted because 0 correct answers is still the result case
    # TODO: Since the csv files are now different for each problem, it is possible to handle whether a student failed other problems because they only tried to work on the first one???????????????
    # group everything by name. For each student, find the first not-all-wrong answer. Only keep
    # the answers including and after that one.
    old_df = df.copy()
    df = df.groupby('name').apply(lambda g: g[g.indexCol >= (g[g.ans != all_wrong_ans])['indexCol'].min()])
    # print(df[df.name == min(df.name)])
    # print(old_df[old_df.name == min(old_df.name)])
    # print(df[df.ans == all_wrong_ans]['indexCol'].max())
    # input('sep>')
    df = df.reset_index(drop = True)

    # print(df)
    df['indexCol'] = df.index
    # print(df.ans == all_wrong_ans)

    # drop everything after getting first correct
    df = df.groupby('name').apply(lambda g: g[g.indexCol <= g.correct.idxmax()])

    # df = df.loc[(df.shift() != df).any(axis=1)] # drop consecutive duplicates

    df = df[['name', 'ans', 'correct']]
    return df



shutil.rmtree(outpublic)                    # remove site directory to later overwrite it
shutil.copytree(inpublic, outpublic)        # ???????????????????????????????????????????

# ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
# Alex's assumption: cleaning all .html and .js files from the 'public' directory
# Appears to be correct


# Automatically inserted in the base code for website folder
"""g = open(graph_path, 'r')
graph_str = g.readlines()
graph_str.insert(163, '<script> updateAnswerLabels(1) </script>\n')  # ??????????????????????/
graph_str = ''.join(graph_str)
g.close()
"""
with open(graph_path) as g:
    graph_str = g.read()  # For future use

# Reading   lesson_reader.js   script
g = open(graph_reader_js_path, 'r')
graph_reader_js_str = ''.join(g.readlines())
g.close()

files_links = []


# Prerequisite:
# What massage.py does is it splits all test cases apart
# There was one csv with ALL problems in a lesson in the   data   folder
# clean_data  now contains SIX FILES FOR EACH STUDENT

for fname in sorted(os.listdir(datafolder)):
    files_links.append(
        '<h3>'
        f'<a href="{fname.replace(".csv", ".html")}">'
        f'    {fname.replace(".csv", "")}'
        '</a>'
        '</h3>'
    )

    clean_df(
        pd.read_csv(
            f'{datafolder}/{fname}',
            header=None,
            names=['name', 'ans', 'correct']
        )
    ).to_csv(
        f'{cleanfolder}/{fname}', index=False, header=False)  # saving new cool dataframe to csv

    # What we got now is:
    # - anonymized name
    # - cleaned data (drop everything after all True's and drop every all False's)


    f = open(f'{cleanfolder}/{fname}')
    g = open(
        f"{outpublic}/{fname.replace('.csv', '.js')}", 'w+')

    to_write = graph_reader_js_str.replace("window.sessionStorage.getItem('table')", "\"" + ''.join(f.readlines()).replace('\n', SPLIT) + "\"")
    to_replace = ".substring(table.indexOf('<tbody>') +  7)"
    to_write = to_write.replace(to_replace, "")
    g.write(to_write)
    f.close()
    g.close()
    g = open(f"{outpublic}/{fname.replace('.csv', '.html')}", 'w+')
    g.write(graph_str.replace("scripts/graph_reader/main_graph_reader.js", f"{fname.replace('.csv', '.js')}"))    # TODO: There SHOULD be a better way, no replaces
    g.close()
    # ^^^^^^^^^^^ Generating a JS and HTML file ^^^^^^^^^^


# TODO: There SHOULD BE A BETTER WAY, too
g = open(lesson_reader_path, 'r')
gstr = ''.join(g.readlines())
g.close()
gstr = gstr.replace('csv_text.split("\\r\\n")', f'csv_text.split("{SPLIT}")')
g = open(lesson_reader_path, 'w+')
g.write(gstr)
g.close()

# TODO: Potentially, if switching to Flask, we may create a new file where we will write the links
# Make the index.html extend that file
# No need to .replace() anything since we will mess up if the text in the file changes
g = open(index_path, 'r')
gstr = ''.join(g.readlines())
g.close()
g = open(index_path, 'w+')
g.write(gstr.replace("Under construction! Check out the *data* page, then go to the *graph* page.", "\n".join(files_links)))
g.close()


# TODO: Explore more this chunk of code. Potential hardcoding with 'Start' || 'Gave Up' .....
# Changed so that the placeholder script contains that
# TODO: Changes data visualization. Ask which one is better
"""
g = open(d3_graph_js_path, 'r')
gstr = ''.join(g.readlines())
g.close()
g = open(d3_graph_js_path, 'w+')
g.write(gstr.replace(".attr('filter', 'url(#solidFilter)')\n    .html(d => d.name)", ".attr('filter', 'url(#solidFilter)')\n    .html(d => ((d.name == 'Start' || d.name == 'Gave Up') ? d.name : (d.name.match(/T/g) || []).length))"))
g.close()
"""


# TODO: I have no idea what this code does but it's now in the base file
"""
g = open(sidenav_js_path, 'r')
gstr = g.readlines()
gstr.insert(81, "   labels.checked = 1\n")
gstr = ''.join(gstr)
g.close()
g = open(sidenav_js_path, 'w+')
g.write(gstr)
g.close()
"""


""" TEST_TIMESTAMPS.PY """

"""
This program tries to work with timestamps.
The formatting of the DATA folder is one level deeper, th eone that extract_stuff.py currently requires.
"""

import csv
import os
import time
from turtle import pen


DATA_DIR = 'debugging_data/warmupandstratching'
MAX_BREAK_TIME_IN_MINUTES = 5
MIN_BREAK_TIME_IN_SECONDS = 30

for folder in os.listdir(DATA_DIR):
    # TODO: DANGER! Replace after I saw the format of different directories
    cur_path = DATA_DIR + '/' + folder + '/src/testSupport/supportData.csv'

    if not os.path.exists(cur_path):
        print("File supportData.csv not found in directory " + folder)
        continue

    print("PRINTING REPORT FOR FOLDER:", folder)

    with open(cur_path) as file:
        if not file.read():
            print("No testing data available for this student because the CV file is empty")
            continue

    file = open(cur_path)
    csv_reader = csv.reader(file, delimiter=',')

    current_time = None
    previous_time = None
    previous_correct = None
    started_current_task_time = None
    current_task_name = None
    previous_task_name = None

    current_task_attempts = -1
    current_task_actual_attempts = current_task_attempts
    got_current_task = False
    tasks_attempted = set()

    for line in csv_reader:
        task_name, got_right, timestamp = line[0], line[2], line[3]

        current_time = time.strptime(timestamp, '%Y-%m-%d %H:%M:%S.%f')
        current_task_attempts += 1
        current_task_actual_attempts += 1

        if got_right == "1" and previous_correct == "1" and task_name == previous_task_name:
            current_task_actual_attempts -= 1

        # First line
        if not previous_time:
            previous_time = current_time
            previous_correct = got_right
            previous_task_name = task_name

            started_current_task_time = current_time
            current_task_name = task_name

            tasks_attempted.add(task_name)

            print("Started the assignment with", task_name)
            continue

        # Started new task
        if task_name != current_task_name:
            time_solving_one_task = time.mktime(current_time) - time.mktime(started_current_task_time)

            print("Switched to a new task" if task_name not in tasks_attempted else "Got back to",
                  task_name, "after ~", time_solving_one_task // 60, "minutes.",
                  "Got" if previous_correct == "1" else "Didn't get", "the current task right.",
                  "Took", current_task_attempts, "attempts.",
                  "Took", current_task_actual_attempts, "ACTUAL attempts.")

            started_current_task_time = current_time
            current_task_name = task_name
            tasks_attempted.add(task_name)

            previous_time = current_time
            previous_correct = got_right
            previous_task_name = task_name
            current_task_attempts = current_task_actual_attempts = 0

            continue

        time_difference_in_seconds = time.mktime(current_time) - time.mktime(previous_time)
        # Break longer than {MAX_BREAK_TIME_IN_MINUTES} minutes
        if time_difference_in_seconds > MAX_BREAK_TIME_IN_MINUTES * 60:
            print("Took a break longer than", MAX_BREAK_TIME_IN_MINUTES, "minutes.",
                  "Got back to solving after ~", time_difference_in_seconds // 60, "minutes.")

        # Break less than {MIN_BREAK_TIME_IN_SECONDS} seconds. Potential guess-and-check
        if time_difference_in_seconds < MIN_BREAK_TIME_IN_SECONDS:
            print("ATTENTION! Potential guess-and-check occured at", timestamp,
                  "Only took", time_difference_in_seconds, "seconds to get to a new test.")
            print("--------------- fyi ---------------")
            print("The timestamp presented on the previous line is the timestamp of the second test. "
                  "If test 1 occured at X and test 2 at Y, Y was printed.")
            print('------------- end fyi -------------')

        previous_time = current_time
        previous_correct = got_right
        previous_task_name = task_name

    file.close()

    print(current_time, started_current_task_time)

    time_solving_one_task = time.mktime(current_time) - time.mktime(started_current_task_time)
    print("Finished the task after ~", time_solving_one_task // 60, "minutes.",
          "Got" if previous_correct == "1" else "Didn't get", "the current task right.",
          "Took", current_task_attempts + 1, "attempts.",
          "Took", current_task_actual_attempts + 1, "ACTUAL attempts.")
    print(f"-------------- END REPORT FOR {folder} ----------------")

    do_continue = input("Do you want to continue and see the report for the next student? (y/n): ").lower()
    if do_continue != "y":
        break

    print()

'''