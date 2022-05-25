//!wrt $BSPEC:{"icn":"apps/taskmgr"}
class TaskManagerApp extends WApplication {
    constructor() {
        super()
    }
    dialogs = []
    ivs=[]
    async main(argv) {
        super.main(argv);
        var win = this.mainwnd = this.createWindow(
            {
                center: true,
                taskbar: true,
                title: "Task Manager",
                icon: await w96.ui.Theme.getIconUrl("apps/taskmgr"),
                body: `<div class="taskmgr-main-content" style="display:flex;flex-direction:column;width:100%;height:100%;">
                <div class="taskmgr-menu-bar">
                </div>
                <div class="taskmgr-task-list" style="height:100%;width:100%;">
                </div>
                <div class="taskmgr-bottom-buttons" style="padding:6px;display:flex;width:100%;height:fit-content;flex-direction:row;align-items:flex-end;justify-content:flex-end">
                <button class="w96-button end-task-button" style="margin-right:8px;">End Task</button>
                <button class="w96-button end-tree-button" style="margin-right:8px;">End Task Tree</button>
                </div>
                </div>`
            }
        );
        var app=this
        var displayingWarning=false
        var warning;
        win.onclose=function(e){
            if(displayingWarning) {
                e.canceled=true
                return
            }
            app.terminate()
            app.onterminated()
        }
        var rac=win.activate
        win.activate=function(){
            rac.call(win)
            if(displayingWarning) {
                drawAttenton(warning.wnd)
            }
        }
        function endTask(id) {
            var task=w96.__debug.processes[id]
            if(!task){return}
            displayingWarning=true
            warning=alert(
                "Do you want to end the task "+getTaskNameBeta(task)+"?",
                {title:"End Task?",buttons:[
                    {
                        id:"end-task",
                        text:"End Task",
                        action: function(e,d){
                            displayingWarning=false;
                            warning.wnd.onclose=null
                            warning.wnd.close()
                            if(!w96.__debug.processes[id]) {
                                displayingWarning=true
                                warning=alert("No task with id "+id+"!", {icon:'error'})
                                warning.onclose=function(){displayingWarning=false;warning=null}
                                app.dialogs.push(warning)
                            } else {
                                w96.__debug.processes[id].terminate()
                            }
                            warning=null
                        }
                    },
                    {
                        id:"spare-task",
                        text:"Spare",
                        action:function(_,d){
                            warning.wnd.close()
                            warning=null
                            displayingWarning=false
                        }
                    }
                ]}
            )
        }
        function endTaskTree(id) {
            var task=w96.__debug.processes[id]
            if(!task){return}
            displayingWarning=true
            warning=alert(
                "Do you want to end the task "+getTaskNameBeta(task)+" and all its child processes?",
                {title:"End Task Tree?",buttons:[
                    {
                        id:"end-task",
                        text:"End Task Tree",
                        action: function(e,d){
                            displayingWarning=false;
                            warning.wnd.onclose=null
                            warning.wnd.close()
                            if(!w96.__debug.processes[id]) {
                                displayingWarning=true
                                warning=alert("No task with id "+id+"!", {icon:'error'})
                                warning.onclose=function(){displayingWarning=false;warning=null}
                                app.dialogs.push(warning)
                            } else {
                                warning=null
                                displayingWarning=false;
                                (async function () {
                                    displayingWarning=true;
                                    var idle=warning=w96.ui.MsgBoxSimple.idleProgress(
                                        "Task Manager",
                                        "Killing tree..."
                                    )
                                    idle.dlg.onclose=function(){
                                        warning=null;displayingWarning=false;
                                    }
                                var list=w96.__debug.processes
                                if(!list){list=[]}
                                for(var f=0;f<list.length;f++) {
                                    try {
                                        var x=w96.__debug.processes[f]
                                        if(!x){continue}
                                        if(!x.tree){continue}
                                        if(x.tree===w96.__debug.processes[selectedTask].tree){x.terminate()}
                                    } catch (er) {
                                        console.error("[taskman] failed to kill child proccess: "+er)
                                    }
                                    await w96.util.wait(1)
                                }
                                idle.dlg.close()
                                })()
                            }
                            warning=null
                        }
                    },
                    {
                        id:"spare-task",
                        text:"Spare",
                        action:function(_,d){
                            warning.wnd.close()
                            warning=null
                            displayingWarning=false
                        }
                    }
                ]}
            )
            warning.wnd.onclose=function() {
                warning=null
                displayingWarning=false
            }
            app.dialogs.push(warning)
        }
        win.show()
        this.ivs.push(setInterval(function(){
            updateTasks()
        },800))
        var dom=win.wndObject.querySelector(".taskmgr-main-content");
        var tasks=new w96.ui.components.ListBox()
        var selectedTask;
        var selectedApp;
        var etb=dom.querySelector(".end-task-button")
        etb.onclick=function(){
            //if(!selectedTask) {return}
            endTask(selectedTask.slice(5))
        }
        var ettb=dom.querySelector(".end-tree-button")
        ettb.onclick=function(){
            //if(!selectedTask) {return}
            //if(!selectedApp) {return}
            endTaskTree(selectedTask.slice(5))
        }
        function updateTasks(c,p,n) {
            tasks._deselectAll()
            tasks.clear()
            var proc=w96.__debug.processes
            for(var i=0;i<proc.length;i++){
                if(!proc[i]) continue;
                if(!proc[i].appId) continue;
                 var cTe=tasks.addItem(
                    getTaskNameBeta(proc[i]),
                    'index'+i
                )
                cTe.dataset.id=proc[i].appId
                
            }
            if(dom.querySelector(".item[ident=\""+selectedTask+"\"]")) {
                tasks.selectItem(selectedTask)
                etb.disabled=false
                ettb.disabled=false
            } else {
                etb.disabled=true
                ettb.disabled=true
            }
        }
        dom.querySelector(".taskmgr-task-list").appendChild(
            tasks.getElement()
        )
        var tsk=tasks.getElement()
        tsk.style.height="100%"
        tasks.onitemselected=function(i){
            selectedTask=i
            selectedApp=dom.querySelector(".taskmgr-task-list [ident=\""+i+"\"]").dataset.id
        }
    }
    onterminated() {
        for (var i = 0; i < this.dialogs.length; i++) {
            try {
                this.dialogs[i].close()
            } catch (error) {
                try {
                    this.dialogs[i].closeDlg()
                } catch (err0r) {
                    null
                }
            }
        }
        for(var i=0;i<this.ivs.length;i++){
            clearInterval(this.ivs[i])
        }
    }
}

async function drawAttentionInternal(win) {
    win.activate()
    await w96.util.wait(40)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
    await w96.util.wait(100)
    w96.WindowSystem.deactivateAllWindows()
    await w96.util.wait(100)
    win.activate()
}

async function getTasks(aoi) {
    var o=[]
    for(var i=0;i<aoi.length;i++) {
        try {
            if(w96.__debug.processes[aoi[i]]) {
                o.push(w96.__debug.processes[aoi[i]])
            } else {
                o.push(null)
            }
        }catch(G){o.push(null)}
    }
    return o
}

async function dingInternal() {
    try {
        await w96.ui.Theme.playSound("asterisk");
    } catch (e) { null }
}

function drawAttenton(win) {
    dingInternal()
    if (!win) { return }
    drawAttentionInternal(win).then(() => { }).catch((e) => { })
}
function domIsBorder(e) {
    if(e.querySelector("#border-root")) {
        if(e.querySelector("#border-root").querySelector("#border-titlebar")) {
            if(e.querySelector("#border-root").querySelector("#border-titlebar").querySelector("#border-tab-menu")) {
                    return true
            }
        }
    }
    return false
}

function domIsExplorer(e){
    return Boolean(e.querySelector(".wexplorer-app"))
}

function domIsMonaco(e){
    return Boolean(e.querySelector(".monaco-app"))
}

function domIsWizard(e){
    return Boolean(e.querySelector(".wizard-app"))
}

function domIsImageViewer(e){
    return Boolean(e.querySelector(".imgviewer-app"))
}

function domIsInternetExploder(e){
    return Boolean(e.querySelector(".iexploder-app"))
}

function domIsGameingLauncher(e){
    return Boolean(e.querySelector(".gameing-launcher-app"))
}

function domIsTextPad(e){
    return Boolean(e.querySelector(".textpad-app"))
}
function getTaskNameBeta(app){
    var name=""
    if(app.taskName) {
        name += app.taskName+" ("
    if(app.constructor){
        if(app.constructor.name) {
            name+=app.constructor.name
        } else {
            name+="PID$_"+app.appId
        }
    } else {
        name+="PID$_"+app.appId
    }
    if(app.taskName) {
        name+=")"
    }
        name+="["+app.appId+"]"
        return name
}
function getTaskNameBetaa(app) {
    var name="Task with id "+app.appId
    var named=false
    if(app.taskName) {
        name=String(app.taskName||"Task with id "+app.appId)||"Task with id "+app.appId;
        named=true
    }
    if(!named) {
    if(appIs(app,domIsExplorer)) {
        name="Windows Explorer"
    }
    if(appIs(app,domIsInternetExploder)) {
        name="Internet Exploder"
    }
    if(appIs(app,domIsMonaco)) {
        name="Monaco"
    }
    if(appIs(app,domIsTextPad)) {
        name="Textpad"
    }
    if(appIs(app,domIsGameingLauncher)) {
        name="Gameing Launcher"
    }
    if(appIs(app,domIsWizard)) {
        name="Windows Wizard"
    }
    if(appIs(app,domIsImageViewer)) {
        name="Image Viewer"
    }
    }
    if(!app._running) name+=" [killed]";
    if(app._terminating&&app._running) name+= "[terminating]"
    return name
}


function appIs(app,f) {
   try{ for(var i=0;i<app.windows.length;i++){
        try{
            if(f(app.windows[i].wndObject)) {
                return true
            }
        }catch(e){0}
    }
   }catch(e){null}
   return false
}

return await w96.WApplication.execAsync(new TaskManagerApp(),this.boxedEnv.args)
