import os
import threading
import json
import time
from flask import Flask, render_template, request
from google.appengine.api import urlfetch
import lxml
from lxml import html
from sys import setrecursionlimit
from Queue import *
app = Flask(__name__)

urlfetch.set_default_fetch_deadline(10)

#################################
# Helper Functions
#################################

def printElapsedTime(start_time):
    current_time = time.time() - start_time
    current_minutes = int(current_time / 60.0)
    current_seconds = int(current_time % 60.0)
    print "Elapsed time: " + str(current_minutes) + " minutes " + str(current_seconds) + " seconds"

def getPageLinks(parentURL, level):
    res = urlfetch.fetch(parentURL)
    tree = lxml.html.fromstring(res.content)

    links = []
    title = None
    for node in tree.iter():
        if node.tag == 'title':
            title = node.text.strip()
            break

    if not title:
        title = parentURL

    for node in tree.iter():
        if node.tag == 'a':
            link = node.get('href')
            if link and link.startswith('http'):
                nextLink = {'parent_title': title, 'parent': parentURL, 'child': link, 'level': level + 1}
                links.append(nextLink)

    return links

def formatResult(result):
    link_parents = {}

    old_result = sorted(result, key=lambda x: x['level'])
    new_result = {'nodes': {}, 'edges': {}}
    max_level = 0

    for link in old_result:
        if link['level'] > max_level:
            max_level += 1
        link_parents[link['child']] = link['parent_title']
        new_result['nodes'][link['parent_title']] = {'link': link['parent'], 'level': link['level']}
        current_children = new_result['edges'].get(link['parent_title'])

        current_parent = new_result['edges'].pop(link['parent'], None)
        new_result['edges'][link['parent_title']] = {link['parent']: {}}
        if current_parent:
            new_result['edges'][link['parent_title']].update(current_parent[link['child']])

        if link['parent_title'] not in new_result['edges']:
            new_result['edges'][link['parent_title']] = {}

        new_result['edges'][link['parent_title']].update({link['child']: {}})

        
        if link['child'] not in new_result['edges']:
            new_result['edges'][link['child']] = {}
    
    for edge in new_result['edges']:
        if edge not in new_result['nodes']:
            new_result['nodes'].update({edge: {'link': edge, 'level': max_level}})

    return new_result        


#################################
# Breadth First Crawl
#################################

def extendBFSResults(link, queue, bfs_result_array):
    lock = threading.Lock()
    links = None

    try:
        links = getPageLinks(link['child'], link['level'])
    except:
        pass

    if links:
        # put new links in back of the queue
        for l in links:
            queue.put((l['level'], l), True, 5)
        
        # add to results
        lock.acquire()
        bfs_result_array.extend(links)
        lock.release()

def breadthFirstCrawl(startingURL, recursionLimit):
    start_time = time.time()
    bfs_result_array = []

    # Each entry is a tuple (priority, object)
    # This ensures breadth first crawling because lowest level items are crawled first
    queue = PriorityQueue()

    # initialize the queue
    queue.put((0, {'parent': None, 'child': startingURL, 'level': 0}))

    while not queue.empty():
        # get next item in priority queue
        next = queue.get(True, 5)[1]
        current_depth = next['level']

        # get all links from queue on the current depth
        this_level = [next]
        while next['level'] == current_depth and not queue.empty():
            next = queue.get(True, 5)[1]

            # Only get pages in current level.
            # If it's not in this level, put it back in the queue.
            if next['level'] != current_depth:
                queue.put((next['level'], next), True, 5)
            else:
                this_level.append(next)
        
        if current_depth <= recursionLimit:
            crawler_jobs = []
            for link in this_level:
                print "BFS Level " + str(current_depth) + " " + link['child']
                printElapsedTime(start_time)

                # create thread for each link
                new_thread = threading.Thread(target=extendBFSResults(link, queue, bfs_result_array))
                crawler_jobs.append(new_thread)

            # execute threads
            for thread in crawler_jobs:
                thread.start()
            for thread in crawler_jobs:
                thread.join()

    return bfs_result_array

#################################
# Depth First Crawl
#################################

def extendDFSResults(link, stack, dfs_result_array):
    links = None
    try:
        links = getPageLinks(link['child'], link['level'])
    except:
        pass
    if links:
        stack.extend(links)
        dfs_result_array.extend(links)

def depthFirstCrawl(startingURL, recursionLimit):
    start_time = time.time()
    dfs_result_array = []

    # initialize stack
    stack = [{'parent': None, 'child': startingURL, 'level': 0}]

    crawler_jobs = []
    while len(stack) > 0:
        next = stack.pop()
        if next['level'] <= recursionLimit:
            print "DFS Level " + str(next['level']) + " " + next['child']
            printElapsedTime(start_time)
            extendDFSResults(next, stack, dfs_result_array)

    return dfs_result_array


#################################
# HTTP Routes
#################################
@app.route('/')
def index():
	return render_template('index.html',content="hello world!")

@app.route('/crawl', methods=['POST'])
def crawl():
    start_time = time.time()
    startingURL= request.form.get('startingURL')
    recursionLimit = int(request.form.get('recursionLimit'))
    searchType = request.form.get('searchType')

    search_start_time = time.time()
    result = []
    if searchType == 'bfs':
        result = breadthFirstCrawl(startingURL, recursionLimit)
    elif searchType == 'dfs':
        result = depthFirstCrawl(startingURL, recursionLimit)
    else:
        result = []
    search_elapsed_time = time.time() - search_start_time

    # Format results
    print "Formatting results..."
    formatted_result = formatResult(result)

    for f in formatted_result:
        print f
        print formatted_result[f]

    print str(len(result)) + " links crawled."
    printElapsedTime(search_start_time)

    return json.dumps({'status': 'Ok', 'count': len(result), 'result': result, 'seconds_elapsed': search_elapsed_time})


@app.errorhandler(404)
def page_not_found(e):
    """Return a custom 404 error."""
    return 'Sorry, Nothing at this URL.', 404


@app.errorhandler(500)
def application_error(e):
    """Return a custom 500 error."""
    return 'Sorry, unexpected error: {}'.format(e), 500

if __name__ == '__main__':
	app.run(host='127.0.0.1', port=8080, debug=True)
