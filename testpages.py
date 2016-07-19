from flask import Flask

app = Flask(__name__)

#############
# Test pages for crawler
# These pages have a tree structure:
#               level0-1
#            /             \
#     level1-1             level1-2
#     /      \             /        \
# level2-1  level2-2   level2-3   level2-4

# BFS should crawl in this order:
# level0-1
# level1-1
# level1-2
# level2-1
# level2-2
# level2-3
# level2-4

# DFS should crawl in this order:
# level0-1
# level1-1
# level2-1
# level2-2
# level1-2
# level2-3
# level2-4

#############
local_port = 5000

@app.route('/')
def index():
    return '<title>Level 0 Page 1</title><a href="http://localhost:' + str(local_port) + '/test-level1-1"><a href="http://localhost:' + str(local_port) + '/test-level1-2">', 200

@app.route('/test-level0-1')
def testlevel0_1():
    return '<title>Level 0 Page 1</title><a href="http://localhost:' + str(local_port) + '/test-level1-1"><a href="http://localhost:' + str(local_port) + '/test-level1-2">', 200

@app.route('/test-level1-1')
def testlevel1_1():
    return '<title>Level 1 Page 1</title><a href="http://localhost:' + str(local_port) + '/test-level2-1"><a href="http://localhost:' + str(local_port) + '/test-level2-2">', 200

@app.route('/test-level1-2')
def testlevel1_2():
    return '<title>Level 1 Page 2</title><a href="http://localhost:' + str(local_port) + '/test-level2-3"><a href="http://localhost:' + str(local_port) + '/test-level2-4">', 200

@app.route('/test-level2-1')
def testlevel2_1():
    return '<title>Level 2 Page 1</title>', 200

@app.route('/test-level2-2')
def testlevel2_2():
    return '<title>Level 2 Page 2</title>', 200

@app.route('/test-level2-3')
def testlevel2_3():
    return '<title>Level 2 Page 3</title>', 200

@app.route('/test-level2-4')
def testlevel2_4():
    return '<title>Level 2 Page 4</title>', 200


app.run(host='0.0.0.0', port=local_port, debug=True)