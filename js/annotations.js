// Annotation System — Injected into Webview with Interactive Objects

let injectedAnnotationState = {
    enabled: false,
    tool: 'arrow',
    color: '#ff0000',
    size: 4,
    objects: [],
    history: []
};

function initAnnotations() {
    const toolbar = elements.annotationToolbar;
    if (!toolbar) return;
    checkAnnotationAccess();
    elements.annotateToggleBtn?.addEventListener('click', toggleAnnotationMode);
    document.querySelectorAll('.annotation-tool[data-tool]').forEach(btn => {
        if (btn.dataset.tool !== 'toggle') {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.annotation-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setAnnotationTool(btn.dataset.tool);
            });
        }
    });
    elements.annotationColor?.addEventListener('change', () => {
        injectedAnnotationState.color = elements.annotationColor.value;
        syncAnnotationStateToWebview();
    });
    elements.annotationSize?.addEventListener('change', () => {
        injectedAnnotationState.size = parseInt(elements.annotationSize.value);
        syncAnnotationStateToWebview();
    });
    elements.clearAnnotationsBtn?.addEventListener('click', clearAnnotations);
    elements.undoAnnotationBtn?.addEventListener('click', undoAnnotation);
    elements.webview?.addEventListener('dom-ready', () => {
        if (injectedAnnotationState.enabled) {
            injectAnnotationSystem();
        }
    });
}

async function checkAnnotationAccess() {
    if (elements.annotationToolbar) {
        elements.annotationToolbar.style.display = 'flex';
    }
}

function setAnnotationTool(tool) {
    injectedAnnotationState.tool = tool;
    syncAnnotationStateToWebview();
}

function toggleAnnotationMode() {
    injectedAnnotationState.enabled = !injectedAnnotationState.enabled;
    const tools = elements.annotationTools;
    const toolbar = elements.annotationToolbar;
    const btn = elements.annotateToggleBtn;
    if (injectedAnnotationState.enabled) {
        tools.style.display = 'flex';
        toolbar.style.display = 'flex';
        btn?.classList.add('active');
        injectAnnotationSystem();
        showNotification('Annotation mode enabled — draw on the page', 'info');
    } else {
        tools.style.display = 'none';
        btn?.classList.remove('active');
        removeAnnotationSystem();
        showNotification('Annotation mode disabled', 'info');
    }
}

function injectAnnotationSystem() {
    const webview = elements.webview;
    if (!webview || webview.style.display === 'none') return;
    const color = injectedAnnotationState.color;
    const size = injectedAnnotationState.size;

    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAnnotator) return;

            var canvas = document.createElement('canvas');
            canvas.id = '__blazeyccAnnotationCanvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '2147483647';
            canvas.style.pointerEvents = 'auto';
            canvas.style.cursor = 'crosshair';
            document.body.appendChild(canvas);

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            var ctx = canvas.getContext('2d');
            var tool = 'arrow';
            var color = '${color}';
            var lineWidth = ${size};
            var isDrawing = false;
            var isDragging = false;
            var isResizing = false;
            var startX = 0, startY = 0;
            var dragOffsetX = 0, dragOffsetY = 0;
            var currentPath = [];
            var objects = [];
            var undone = [];
            var selectedObj = null;
            var resizeHandle = null; // 'nw','ne','sw','se'
            var HANDLE_SIZE = 8;

            function getHandleAt(x, y, obj) {
                if (obj.type === 'arrow') {
                    var handles = [
                        { name: 'start', x: obj.x1, y: obj.y1 },
                        { name: 'end', x: obj.x2, y: obj.y2 }
                    ];
                    for (var h of handles) {
                        if (Math.abs(x - h.x) < HANDLE_SIZE && Math.abs(y - h.y) < HANDLE_SIZE) return h.name;
                    }
                } else if (obj.type === 'rectangle') {
                    var handles = [
                        { name: 'nw', x: obj.x, y: obj.y },
                        { name: 'ne', x: obj.x + obj.w, y: obj.y },
                        { name: 'sw', x: obj.x, y: obj.y + obj.h },
                        { name: 'se', x: obj.x + obj.w, y: obj.y + obj.h }
                    ];
                    for (var h of handles) {
                        if (Math.abs(x - h.x) < HANDLE_SIZE && Math.abs(y - h.y) < HANDLE_SIZE) return h.name;
                    }
                } else if (obj.type === 'circle') {
                    var handles = [
                        { name: 'nw', x: obj.cx - obj.rx, y: obj.cy - obj.ry },
                        { name: 'ne', x: obj.cx + obj.rx, y: obj.cy - obj.ry },
                        { name: 'sw', x: obj.cx - obj.rx, y: obj.cy + obj.ry },
                        { name: 'se', x: obj.cx + obj.rx, y: obj.cy + obj.ry }
                    ];
                    for (var h of handles) {
                        if (Math.abs(x - h.x) < HANDLE_SIZE && Math.abs(y - h.y) < HANDLE_SIZE) return h.name;
                    }
                } else if (obj.type === 'text') {
                    var tw = ctx.measureText(obj.text).width;
                    var handles = [
                        { name: 'move', x: obj.x + tw/2, y: obj.y - 10 }
                    ];
                    for (var h of handles) {
                        if (Math.abs(x - h.x) < HANDLE_SIZE * 2 && Math.abs(y - h.y) < HANDLE_SIZE * 2) return h.name;
                    }
                }
                return null;
            }

            function hitTest(x, y) {
                // Test in reverse (topmost first)
                for (var i = objects.length - 1; i >= 0; i--) {
                    var obj = objects[i];
                    var handle = getHandleAt(x, y, obj);
                    if (handle) return { obj: obj, index: i, handle: handle };
                    // Bounding box test
                    if (obj.type === 'arrow') {
                        // Line distance test
                        var A = x - obj.x1, B = y - obj.y1, C = obj.x2 - obj.x1, D = obj.y2 - obj.y1;
                        var dot = A * C + B * D;
                        var lenSq = C * C + D * D;
                        var param = lenSq !== 0 ? dot / lenSq : -1;
                        var xx, yy;
                        if (param < 0) { xx = obj.x1; yy = obj.y1; }
                        else if (param > 1) { xx = obj.x2; yy = obj.y2; }
                        else { xx = obj.x1 + param * C; yy = obj.y1 + param * D; }
                        var dist = Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
                        if (dist < 10) return { obj: obj, index: i, handle: null };
                    } else if (obj.type === 'rectangle') {
                        if (x >= Math.min(obj.x, obj.x + obj.w) - 5 && x <= Math.max(obj.x, obj.x + obj.w) + 5 &&
                            y >= Math.min(obj.y, obj.y + obj.h) - 5 && y <= Math.max(obj.y, obj.y + obj.h) + 5) {
                            return { obj: obj, index: i, handle: null };
                        }
                    } else if (obj.type === 'circle') {
                        var dx = (x - obj.cx) / Math.max(obj.rx, 1);
                        var dy = (y - obj.cy) / Math.max(obj.ry, 1);
                        if (dx * dx + dy * dy <= 1.2) return { obj: obj, index: i, handle: null };
                    } else if (obj.type === 'text') {
                        var tw = ctx.measureText(obj.text).width;
                        if (x >= obj.x - 5 && x <= obj.x + tw + 5 && y >= obj.y - 25 && y <= obj.y + 5) {
                            return { obj: obj, index: i, handle: null };
                        }
                    } else if (obj.type === 'highlight') {
                        for (var j = 0; j < obj.points.length; j++) {
                            var p = obj.points[j];
                            if (Math.abs(x - p.x) < 15 && Math.abs(y - p.y) < 15) {
                                return { obj: obj, index: i, handle: null };
                            }
                        }
                    }
                }
                return null;
            }

            function drawSelection(obj) {
                if (!obj) return;
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                if (obj.type === 'arrow') {
                    ctx.beginPath();
                    ctx.arc(obj.x1, obj.y1, 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(obj.x2, obj.y2, 5, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (obj.type === 'rectangle') {
                    ctx.strokeRect(obj.x - 2, obj.y - 2, obj.w + 4, obj.h + 4);
                    var handles = [
                        [obj.x, obj.y], [obj.x + obj.w, obj.y],
                        [obj.x, obj.y + obj.h], [obj.x + obj.w, obj.y + obj.h]
                    ];
                    handles.forEach(function(h) {
                        ctx.fillStyle = '#00aaff';
                        ctx.fillRect(h[0] - 3, h[1] - 3, 6, 6);
                    });
                } else if (obj.type === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(obj.cx, obj.cy, obj.rx + 5, obj.ry + 5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (obj.type === 'text') {
                    var tw = ctx.measureText(obj.text).width;
                    ctx.strokeRect(obj.x - 2, obj.y - 22, tw + 4, 26);
                }
                ctx.setLineDash([]);
            }

            function redraw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (var i = 0; i < objects.length; i++) {
                    drawObject(objects[i]);
                }
                drawSelection(selectedObj);
            }

            function drawObject(obj) {
                ctx.strokeStyle = obj.color;
                ctx.fillStyle = obj.color;
                ctx.lineWidth = obj.lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (obj.type === 'arrow') {
                    ctx.beginPath();
                    ctx.moveTo(obj.x1, obj.y1);
                    ctx.lineTo(obj.x2, obj.y2);
                    ctx.stroke();
                    var angle = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
                    var headLen = obj.lineWidth * 4;
                    ctx.beginPath();
                    ctx.moveTo(obj.x2, obj.y2);
                    ctx.lineTo(obj.x2 - headLen * Math.cos(angle - Math.PI/6), obj.y2 - headLen * Math.sin(angle - Math.PI/6));
                    ctx.lineTo(obj.x2 - headLen * Math.cos(angle + Math.PI/6), obj.y2 - headLen * Math.sin(angle + Math.PI/6));
                    ctx.closePath();
                    ctx.fill();
                } else if (obj.type === 'rectangle') {
                    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
                } else if (obj.type === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(obj.cx, obj.cy, obj.rx, obj.ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (obj.type === 'highlight') {
                    ctx.globalAlpha = 0.3;
                    ctx.lineWidth = obj.lineWidth * 4;
                    ctx.beginPath();
                    if (obj.points.length > 0) {
                        ctx.moveTo(obj.points[0].x, obj.points[0].y);
                        for (var j = 1; j < obj.points.length; j++) {
                            ctx.lineTo(obj.points[j].x, obj.points[j].y);
                        }
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                } else if (obj.type === 'text') {
                    ctx.font = 'bold ' + (obj.lineWidth * 5) + 'px sans-serif';
                    ctx.fillStyle = obj.color;
                    ctx.fillText(obj.text, obj.x, obj.y);
                }
            }

            canvas.addEventListener('mousedown', function(e) {
                if (!window.__blazeyccAnnotatorEnabled) return;
                startX = e.clientX;
                startY = e.clientY;

                if (tool === 'select') {
                    var hit = hitTest(startX, startY);
                    if (hit) {
                        selectedObj = hit.obj;
                        if (hit.handle) {
                            isResizing = true;
                            resizeHandle = hit.handle;
                        } else {
                            isDragging = true;
                            dragOffsetX = startX;
                            dragOffsetY = startY;
                        }
                        redraw();
                        return;
                    } else {
                        selectedObj = null;
                        redraw();
                    }
                    return;
                }

                isDrawing = true;
                currentPath = [{x: startX, y: startY}];
            });

            canvas.addEventListener('mousemove', function(e) {
                if (!window.__blazeyccAnnotatorEnabled) return;
                var x = e.clientX;
                var y = e.clientY;

                if (isDragging && selectedObj) {
                    var dx = x - dragOffsetX;
                    var dy = y - dragOffsetY;
                    dragOffsetX = x;
                    dragOffsetY = y;
                    if (selectedObj.type === 'arrow') {
                        selectedObj.x1 += dx; selectedObj.y1 += dy;
                        selectedObj.x2 += dx; selectedObj.y2 += dy;
                    } else if (selectedObj.type === 'rectangle') {
                        selectedObj.x += dx; selectedObj.y += dy;
                    } else if (selectedObj.type === 'circle') {
                        selectedObj.cx += dx; selectedObj.cy += dy;
                    } else if (selectedObj.type === 'text') {
                        selectedObj.x += dx; selectedObj.y += dy;
                    } else if (selectedObj.type === 'highlight') {
                        selectedObj.points.forEach(function(p) { p.x += dx; p.y += dy; });
                    }
                    redraw();
                    return;
                }

                if (isResizing && selectedObj) {
                    if (selectedObj.type === 'arrow') {
                        if (resizeHandle === 'start') { selectedObj.x1 = x; selectedObj.y1 = y; }
                        else if (resizeHandle === 'end') { selectedObj.x2 = x; selectedObj.y2 = y; }
                    } else if (selectedObj.type === 'rectangle') {
                        if (resizeHandle === 'se') { selectedObj.w = x - selectedObj.x; selectedObj.h = y - selectedObj.y; }
                        else if (resizeHandle === 'sw') { selectedObj.w = selectedObj.x + selectedObj.w - x; selectedObj.x = x; selectedObj.h = y - selectedObj.y; }
                        else if (resizeHandle === 'ne') { selectedObj.w = x - selectedObj.x; selectedObj.h = selectedObj.y + selectedObj.h - y; selectedObj.y = y; }
                        else if (resizeHandle === 'nw') { selectedObj.w = selectedObj.x + selectedObj.w - x; selectedObj.x = x; selectedObj.h = selectedObj.y + selectedObj.h - y; selectedObj.y = y; }
                    } else if (selectedObj.type === 'circle') {
                        if (resizeHandle === 'se') { selectedObj.rx = Math.abs(x - selectedObj.cx); selectedObj.ry = Math.abs(y - selectedObj.cy); }
                        else if (resizeHandle === 'sw') { selectedObj.rx = Math.abs(selectedObj.cx - x); selectedObj.ry = Math.abs(y - selectedObj.cy); }
                        else if (resizeHandle === 'ne') { selectedObj.rx = Math.abs(x - selectedObj.cx); selectedObj.ry = Math.abs(selectedObj.cy - y); }
                        else if (resizeHandle === 'nw') { selectedObj.rx = Math.abs(selectedObj.cx - x); selectedObj.ry = Math.abs(selectedObj.cy - y); }
                    }
                    redraw();
                    return;
                }

                if (!isDrawing) {
                    // Hover cursor
                    if (tool === 'select') {
                        var hit = hitTest(x, y);
                        if (hit && hit.handle) canvas.style.cursor = 'nwse-resize';
                        else if (hit) canvas.style.cursor = 'move';
                        else canvas.style.cursor = 'default';
                    }
                    return;
                }

                if (tool === 'highlight') {
                    currentPath.push({x: x, y: y});
                    ctx.globalAlpha = 0.3;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth * 4;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    startX = x;
                    startY = y;
                } else if (tool === 'arrow' || tool === 'rectangle' || tool === 'circle') {
                    redraw();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.lineCap = 'round';
                    if (tool === 'arrow') {
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    } else if (tool === 'rectangle') {
                        ctx.strokeRect(startX, startY, x - startX, y - startY);
                    } else if (tool === 'circle') {
                        var rx = Math.abs(x - startX) / 2;
                        var ry = Math.abs(y - startY) / 2;
                        var cx = startX + (x - startX) / 2;
                        var cy = startY + (y - startY) / 2;
                        ctx.beginPath();
                        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });

            canvas.addEventListener('mouseup', function(e) {
                if (isDragging) { isDragging = false; return; }
                if (isResizing) { isResizing = false; resizeHandle = null; return; }
                if (!isDrawing) return;
                isDrawing = false;
                var x = e.clientX;
                var y = e.clientY;

                if (tool === 'arrow') {
                    objects.push({type:'arrow', x1:startX, y1:startY, x2:x, y2:y, color:color, lineWidth:lineWidth});
                } else if (tool === 'rectangle') {
                    objects.push({type:'rectangle', x:startX, y:startY, w:x-startX, h:y-startY, color:color, lineWidth:lineWidth});
                } else if (tool === 'circle') {
                    var rx = Math.abs(x - startX) / 2;
                    var ry = Math.abs(y - startY) / 2;
                    var cx = startX + (x - startX) / 2;
                    var cy = startY + (y - startY) / 2;
                    objects.push({type:'circle', cx:cx, cy:cy, rx:rx, ry:ry, color:color, lineWidth:lineWidth});
                } else if (tool === 'highlight') {
                    objects.push({type:'highlight', points:currentPath, color:color, lineWidth:lineWidth});
                }
                undone = [];
                redraw();
            });

            // Delete selected on Delete/Backspace key
            document.addEventListener('keydown', function(e) {
                if (!window.__blazeyccAnnotatorEnabled) return;
                if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObj && tool === 'select') {
                    var idx = objects.indexOf(selectedObj);
                    if (idx >= 0) {
                        undone.push(objects.splice(idx, 1)[0]);
                        selectedObj = null;
                        redraw();
                    }
                }
            });

            window.addEventListener('resize', function() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                redraw();
            });

            var scrollSync = function() {
                canvas.__scrollX = window.scrollX;
                canvas.__scrollY = window.scrollY;
            };
            window.addEventListener('scroll', scrollSync);

            // Text tool — create input on click
            canvas.addEventListener('dblclick', function(e) {
                if (!window.__blazeyccAnnotatorEnabled || tool !== 'text') return;
                var input = document.createElement('input');
                input.type = 'text';
                input.style.position = 'fixed';
                input.style.left = e.clientX + 'px';
                input.style.top = e.clientY + 'px';
                input.style.zIndex = '2147483648';
                input.style.background = 'transparent';
                input.style.border = 'none';
                input.style.outline = 'none';
                input.style.color = color;
                input.style.fontSize = (lineWidth * 5) + 'px';
                input.style.fontWeight = 'bold';
                input.style.fontFamily = 'sans-serif';
                input.style.minWidth = '100px';
                document.body.appendChild(input);
                input.focus();
                input.addEventListener('keydown', function(ev) {
                    if (ev.key === 'Enter') {
                        if (input.value) {
                            objects.push({type:'text', text:input.value, x:e.clientX, y:e.clientY + 20, color:color, lineWidth:lineWidth});
                            undone = [];
                            redraw();
                        }
                        input.remove();
                    } else if (ev.key === 'Escape') {
                        input.remove();
                    }
                });
                input.addEventListener('blur', function() {
                    if (input.value) {
                        objects.push({type:'text', text:input.value, x:e.clientX, y:e.clientY + 20, color:color, lineWidth:lineWidth});
                        undone = [];
                        redraw();
                    }
                    input.remove();
                });
            });

            window.__blazeyccAnnotator = {
                canvas: canvas,
                setTool: function(t) { 
                    tool = t; 
                    selectedObj = null;
                    canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
                    redraw();
                },
                setColor: function(c) { color = c; redraw(); },
                setSize: function(s) { lineWidth = s; redraw(); },
                clear: function() { objects = []; undone = []; selectedObj = null; redraw(); },
                undo: function() {
                    if (objects.length > 0) {
                        undone.push(objects.pop());
                        selectedObj = null;
                        redraw();
                    }
                },
                remove: function() {
                    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                    delete window.__blazeyccAnnotator;
                    delete window.__blazeyccAnnotatorEnabled;
                }
            };

            window.__blazeyccAnnotatorEnabled = true;
        })()
    `, true);
}

function removeAnnotationSystem() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAnnotator) {
                window.__blazeyccAnnotatorEnabled = false;
                window.__blazeyccAnnotator.remove();
            }
        })()
    `, true);
}

function syncAnnotationStateToWebview() {
    const webview = elements.webview;
    if (!webview || !injectedAnnotationState.enabled) return;
    const tool = injectedAnnotationState.tool;
    const color = injectedAnnotationState.color;
    const size = injectedAnnotationState.size;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAnnotator) {
                window.__blazeyccAnnotator.setTool('${tool}');
                window.__blazeyccAnnotator.setColor('${color}');
                window.__blazeyccAnnotator.setSize(${size});
            }
        })()
    `, true);
}

function clearAnnotations() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAnnotator) window.__blazeyccAnnotator.clear();
        })()
    `, true);
    showNotification('Annotations cleared', 'info');
}

function undoAnnotation() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAnnotator) window.__blazeyccAnnotator.undo();
        })()
    `, true);
}

function getAnnotationImageData() {
    return null;
}

async function mergeAnnotationsWithFrame(frameData) {
    return frameData;
}
