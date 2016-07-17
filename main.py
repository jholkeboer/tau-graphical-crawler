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
    for node in tree.iter():
        if node.tag == 'a':
            link = node.get('href')
            if link and link.startswith('http'):
                nextLink = {'parent': parentURL, 'child': link, 'level': level + 1}
                links.append(nextLink)
    return links

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

    # Each entry is (priority, object)
    # This ensures breadth first crawling because lowest level items are crawled first
    queue = PriorityQueue()

    queue.put((0, {'parent': None, 'child': startingURL, 'level': 0}))

    while not queue.empty():
        next = queue.get(True, 5)[1]
        current_depth = next['level']
        this_level = [next]
        while next['level'] == current_depth and not queue.empty():
            next = queue.get(True, 5)[1]
            if next['level'] < current_depth:
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

            for thread in crawler_jobs:
                thread.start()
            for thread in crawler_jobs:
                thread.join()

    return bfs_result_array

#################################
# Depth First Crawl
#################################

def extendDFSResults(link, stack, dfs_result_array):
    lock = threading.Lock()
    links = None
    try:
        links = getPageLinks(link['child'], link['level'])
    except:
        pass
    if links:
        lock.acquire()
        stack.extend(links)
        dfs_result_array.extend(links)
        lock.release()

def depthFirstCrawl(startingURL, recursionLimit):
    start_time = time.time()
    dfs_result_array = []

    stack = [{'parent': None, 'child': startingURL, 'level': 0}]

    while len(stack) > 0:
        next = stack.pop()
        current_depth = next['level']
        this_level = [next]
        while next['level'] == current_depth and len(stack) > 0:
            next = stack.pop()
            if next['level'] < current_depth:
                stack.append(next)
            else:
                this_level.append(next)

        if current_depth <= recursionLimit:
            crawler_jobs = []
            for link in this_level:
                print "DFS Level " + str(current_depth) + " " + link['child']
                printElapsedTime(start_time)

                # create thread for each link
                new_thread = threading.Thread(target=extendDFSResults(link, stack, dfs_result_array))
                crawler_jobs.append(new_thread)
            
            for thread in crawler_jobs:
                thread.start()
            for thread in crawler_jobs:
                thread.join()

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

    print str(len(result)) + " links crawled."
    print "Total runtime: "
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
