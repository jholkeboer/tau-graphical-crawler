import os
import threading
import json
import time
from datetime import timedelta
from flask import Flask, render_template, request
from google.appengine.api import urlfetch
import lxml
from lxml import html
from sys import setrecursionlimit
app = Flask(__name__)

setrecursionlimit(100000000)

def extendBFSResults(link, recursionLimit, currentLevel, start_time, this_level_results):
    lock = threading.Lock()
    lock.acquire()
    this_level_results.extend(breadthFirstCrawl(link['child'], recursionLimit, currentLevel + 1, start_time))
    lock.release()

def getPageLinks(parentURL):
    res = urlfetch.fetch(parentURL)
    tree = lxml.html.fromstring(res.content)

    links = []
    for node in tree.iter():
        if node.tag == 'a':
            link = node.get('href')
            if link and link.startswith('http'):
                nextLink = {'parent': parentURL, 'child': link}
                # print nextLink
                links.append(nextLink)
    return links

def breadthFirstCrawl(startingURL, recursionLimit, currentLevel, start_time):
    print "Level" + str(currentLevel) + " Recursion Limit " + str(recursionLimit)
    print "Elapsed time = " + str(time.time() - start_time)

    parent_links = None

    this_level_results = []

    try:
        parent_links = getPageLinks(startingURL)
    except:
        pass

    if parent_links:
        this_level_results.extend(parent_links)

    if currentLevel < recursionLimit and parent_links:

        # call recursively on each link
        # crawl each page in a separate thread
        crawler_jobs = []
        for link in parent_links:
            new_thread = threading.Thread(target=extendBFSResults(link, recursionLimit, currentLevel, start_time, this_level_results))
            crawler_jobs.append(new_thread)
        
        for thread in crawler_jobs:
            thread.start()
        for thread in crawler_jobs:
            thread.join()

    return this_level_results

# def depthFirstCrawl(startingURL, recursionLimit, currentLevel, start_time):
#     print "Level" + str(currentLevel) + " Recursion Limit " + str(recursionLimit)

#     results = []

#     try:
#         parent_links = getPageLinks(startingURL)
#         results.extend(parent_links)
#     except:
#         pass
    
#     # if currentLevel < recursionLimit:
#     #     for link in parent_links:
#     #         results.extend(depthFirstCrawl(link['child'], recursionLimit, currentLevel + 1))

#     return results

@app.route('/')
def index():
	return render_template('index.html',content="hello world!")

@app.route('/crawl', methods=['POST'])
def crawl():
    start_time = time.time()
    startingURL= request.form.get('startingURL')
    recursionLimit = int(request.form.get('recursionLimit'))
    searchType = request.form.get('searchType')
    
    print startingURL
    print recursionLimit
    print searchType

    search_start_time = time.time()
    result = []
    if searchType == 'bfs':
        result = breadthFirstCrawl(startingURL, recursionLimit, 0, start_time)
    elif searchType == 'dfs':
        result = depthFirstCrawl(startingURL, recursionLimit, 0, start_time)
    else:
        result = []
    search_end_time = time.time() - search_start_time

    # return unique elements
    # result = set(result)

    return json.dumps({'status': 'Ok', 'count': len(result), 'result': result, 'seconds_elapsed': search_end_time})


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
