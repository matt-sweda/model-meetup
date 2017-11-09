/*
 * Model Meetup -- Real-time, multi-user object viewer project.
 * Used in conjunction with a server written in Go.
 *
 * Created by Matthew Sweda, May 2017
 */

/***************************************************
 * Global Variables
 ***************************************************/

// Declare variables for three.js to use.
var camera, renderer, scene;

// Handles to the topbar elements.
var currentModelSelect, currentModelHandle, removeButton, addButton;

// Handles to the add model popup box.
var addModelModal, closeSpan, geometrySelect, selectedGeometry,
    planeInput, boxInput, sphereInput, coneInput, JSONDiv, JSONFilename, addButton2;

// Handles to the remove model popup box.
var removeModelModal, closeSpan2, removeYes, removeNo;

// Handles to the property elements.
var currentPropertySelect, xInput, yInput, zInput, updateButton;

// An object that stores handles to all the models in the scene.
var allModels = new Object();

// A THREE.js JSON loader.
var loader = null;

// Script entry point.
// Open a websocket connection to the server.
// Initialize three.js, and schedule the first animation frame.
window.onload = function() {
    // First check whether the user has webgl.
    if ( ! Detector.webgl ) {
        // If they don't, output an error message.
        Detector.addGetWebGLMessage();
    } else {
        // Initialize everything.
        init();
        // Schedule the first animation frame.
        requestAnimationFrame(update);
    }
}
  
function init() {
    // Get handles to all the necessary DOM objects.
    currentModelSelect = document.getElementById('currentModelSelect');
    removeButton = document.getElementById('removeButton');
    addButton = document.getElementById('addButton');
    
    addModelModal = document.getElementById('addModelModal');
    closeSpan = document.getElementsByClassName('close')[0];
    geometrySelect = document.getElementById('geometrySelect');
    planeInput = document.getElementById('planeInput');
    boxInput = document.getElementById('boxInput');
    sphereInput = document.getElementById('sphereInput');
    coneInput = document.getElementById('coneInput');
    colorInput = document.getElementById('colorInput');
    JSONDiv = document.getElementById('JSONDiv');
    JSONFilename = document.getElementById('JSONFilename');
    addButton2 = document.getElementById('addButton2');
    
    removeModelModal = document.getElementById('removeModelModal');
    closeSpan2 = document.getElementsByClassName('close')[1];
    removeYes = document.getElementById('removeYes');
    removeNo = document.getElementById('removeNo');
    
    currentPropertySelect = document.getElementById('currentPropertySelect');
    xInput = document.getElementById('xInput');
    yInput = document.getElementById('yInput');
    zInput = document.getElementById('zInput');
    updateButton = document.getElementById('updateButton');
    
    // Initialize the current model handle.
    currentModelHandle = currentModelSelect.options[currentModelSelect.selectedIndex].text;
    
    // Set initial submenu appearance.
    hideGeometryInput();
    planeInput.style.display = "block";
    selectedGeometry = "Plane";
    colorDiv.style.display = "block";
    
    // Setup event listeners.
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'click', onWindowClick, false );
    
    currentModelSelect.addEventListener('change', onCurrentModelChange, false);
    addButton.addEventListener('click', onAddButtonClick, false);
    removeButton.addEventListener( 'click', onRemoveButtonClick, false );
    
    closeSpan.addEventListener('click', onCloseSpanClick, false);
    geometrySelect.addEventListener('change', onGeometrySelectChange, false);
    addButton2.addEventListener('click', onAddButton2Click, false);
    
    closeSpan2.addEventListener('click', onCloseSpanClick, false);
    removeYes.addEventListener( 'click', onRemoveYesClick, false );
    removeNo.addEventListener( 'click', onCloseSpanClick, false );
    
    currentPropertySelect.addEventListener('change', onCurrentPropertyChange, false);
    updateButton.addEventListener('click', onUpdateButtonClick, false);
    
    // Setup the websocket if one exists...
    if ("WebSocket" in window) {
		// Open a new websocket.
		ws = new WebSocket("ws://"+document.location.host+"/ws");
        // Tell the websocket what type of data to transmit.
		ws.binaryType = "arraybuffer";
        // Define a function to trigger on opening.
		ws.onopen = function() {
			console.log("Connection open");
		}
        // Define a function to trigger on receiving a message.
		ws.onmessage = function(event) { receiveMessage(event); };
        // Define a function to trigger on closing.
		ws.onclose = function() { 
			console.log("Connection is closed..."); 
		};
	} else {
        // There is no available websocket, so get all bummed out.
		console.log("No websockets available.");
	}
                    
    // Setup Three.js...
    
    // Create a new camera, and set its initial position.
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 20000 );
    camera.position.set( 0, 5, 10 );
    
    // Create a new renderer, and initialize its settings.
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x89CFF0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    // Append the renderer to the DOM.
    document.body.appendChild( renderer.domElement );
    
    // Create orbit controls to look about the scene.
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minPolarAngle = -Math.PI/2;
    controls.maxPolarAngle = Math.PI/2;
        
    // Create a new scene.
    scene = new THREE.Scene();
    
    // Add a grid to the scene.
    var gridHelper = new THREE.GridHelper( 100, 100 );
    scene.add( gridHelper );
    
    // Add an ambient light to the scene.
    var light = new THREE.AmbientLight(0x707070);
    scene.add(light);
    
    // Add a point light to the scene.
    var pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;
    scene.add(pointLight);
    
    // Create a new JSON file loader.
    loader = new THREE.JSONLoader();
}

// Handle what happens when the window is resized.
function onWindowResize() {
    // Update the aspect ratio of the camera.
    camera.aspect = window.innerWidth / window.innerHeight;
    // Update the camera's projection matrix.
    camera.updateProjectionMatrix();
    // Resize the renderer.
    renderer.setSize( window.innerWidth, window.innerHeight );
}

// Handle what happens when the current model select changes.
function onCurrentModelChange() {
    // Set the current model handle variable.
    currentModelHandle = currentModelSelect.value;
    
    // Change the property display values.
    onCurrentPropertyChange();
}

// Open the add popup when the add button is pressed.
function onAddButtonClick() {
    addModelModal.style.display = "block";
}

// Open the remove popup if a model is selected and the remove button is pressed.
function onRemoveButtonClick() {
    if (currentModelHandle != "Choose a model") {
        removeModelModal.style.display = "block";
    }
}

// Close popup windows if the user clicks outside them.
function onWindowClick() {
    if (event.target == addModelModal) {
        addModelModal.style.display = "none";
    } else if (event.target == removeModelModal) {
        removeModelModal.style.display = "none";
    }  
}

// If the user clicks on <span> (x), close the popup.
function onCloseSpanClick() {
    addModelModal.style.display = "none";
    removeModelModal.style.display = "none";
}

// Set the display of each submenu to none.
function hideGeometryInput() {
    planeInput.style.display  = "none";
    boxInput.style.display    = "none";
    sphereInput.style.display = "none";
    coneInput.style.display   = "none";
    colorDiv.style.display    = "none";
    JSONDiv.style.display   = "none";
}

// Handle what happens when the geometry select in the add popup changes.
function onGeometrySelectChange(ev) {
    // Hide all the submenus.
    hideGeometryInput();
    // Now show only the correct popup inputs.
    selectedGeometry = geometrySelect.value;
    switch(selectedGeometry) {
        case "Plane":
            planeInput.style.display = "block";
            colorDiv.style.display = "block";
            break;
        case "Box":
            boxInput.style.display = "block";
            colorDiv.style.display = "block";
            break;
        case "Sphere":
            sphereInput.style.display = "block";
            colorDiv.style.display = "block";
            break;
        case "Cone":
            coneInput.style.display = "block";
            colorDiv.style.display = "block";
            break;
        case "JSON File":
            JSONDiv.style.display = "block";
            break;
    }
}

// Handle what happens when the add button is pressed.
function onAddButton2Click() {
    // Close the modal.
    onCloseSpanClick();
    
    // Send an "add" message to the server.
    if (selectedGeometry == "JSON File") {
        sendMessage(1, selectedGeometry, null, JSONFilename.value);
    } else {
        sendMessage(1, selectedGeometry, null, colorInput.value);
    }
}

// Handle what happens when the user agrees to remove the selected model.
function onRemoveYesClick() {
    // Close the modal.
    onCloseSpanClick();
    
    // Send a "remove" message to the server.
    sendMessage(2, currentModelHandle, null, null);
}

// Handle what happens when the current property select is changed.
function onCurrentPropertyChange() {
    // Update the selected property.
    selectedProperty = currentPropertySelect.value;
    
    // If the model handle is the default text, clear the inputs.
    // Otherwise, update the inputs to reflect that model's chosen property.
    if (currentModelHandle == "Choose a model") {
        xInput.value = "";
        yInput.value = "";
        zInput.value = "";
    } else {
        switch(selectedProperty) {
            case "Position":
                xInput.value = allModels[currentModelHandle].position.x;
                yInput.value = allModels[currentModelHandle].position.y;
                zInput.value = allModels[currentModelHandle].position.z;
                break;
            case "Rotation":
                xInput.value = allModels[currentModelHandle].rotation.x;
                yInput.value = allModels[currentModelHandle].rotation.y;
                zInput.value = allModels[currentModelHandle].rotation.z;
                break;
            case "Scale":
                xInput.value = allModels[currentModelHandle].scale.x;
                yInput.value = allModels[currentModelHandle].scale.y;
                zInput.value = allModels[currentModelHandle].scale.z;
                break;
        }
    }
}

// Handle what happens when the update button is pressed.
function onUpdateButtonClick() {
    var transformation = [parseFloat(xInput.value), 
                          parseFloat(yInput.value), 
                          parseFloat(zInput.value)];
    
    switch(selectedProperty) {
        case "Position":
            sendMessage(3, currentModelHandle, transformation, null);
            break;
        case "Rotation":
            sendMessage(4, currentModelHandle, transformation, null);
            break;
        case "Scale":
            sendMessage(5, currentModelHandle, transformation, null);
            break;
    }
}

/*
 * Messages via the websocket are the crux of this project.
 * To send a message to the running server, simply call the sendMessage() function.
 * The server will automatically send the message to every active client (including this one).
 *
 * messageType: an integer signifying which type of data is being passed.
 *      1: add: Use to create a new model in the global scene.
 *      2: remove: Use to remove the modelNumber-th object from the scene.
 *      3: translate: Use to set the position the modelNumber-th object.
 *      4: rotate: Use to set the rotation of the modelNumber-th object.
 *      5: scale: Use to set the scale of the modelNumber-th object.
 *
 * floatArrayData: an array of floating point values.
 * stringData: a string.
 */

function sendMessage(msgType, modelHandle, floatArrayData, stringData) {
    // Check that the web socket exists. If so, send the message.
    if (this.ws) {
        this.ws.send(
            JSON.stringify({
                messageType: msgType,
                modelHandle: modelHandle,
                floatArrayData: floatArrayData,
                stringData: stringData
            })
        );
    }
}

// Call a handler function based on what message was received.
function receiveMessage(event) {
    // Parse the message.
    var msg = JSON.parse(event.data);
    
    switch (msg.messageType) {
        case 1: // Add
            addModel(msg.modelHandle, msg.floatArrayData, msg.stringData);
            break;
        case 2: // Remove
            removeModel(msg.modelHandle);
            onCurrentModelChange();
            break;
        case 3: // Move
            moveModel(msg.modelHandle, msg.floatArrayData);
            break;
        case 4: // Rotate
            rotateModel(msg.modelHandle, msg.floatArrayData);
            break;
        case 5: // Scale
            scaleModel(msg.modelHandle, msg.floatArrayData);
            break;
        default: // Unknown message
            console.log("Invalid Message.");
    }
}

// Add the specified model to the scene.
function addModel(modelHandle, floatArrayData, stringData) {
    // Create a new model based on what type of geometry is asked for.
    if ( modelHandle.includes("JSON") ) {
        loadModel(stringData, modelHandle);
    } else {
        var geometry, material, model;
        
        // Define the material to use.
        material = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF, // Set default material
            side: THREE.DoubleSide
        });
        material.color.setHex(stringData);
        
        // Define geometry based on the model handle.
        if ( modelHandle.includes("Plane")) {
            geometry = new THREE.PlaneGeometry(1, 1, 10, 10);
        } else if ( modelHandle.includes("Box")) {
            geometry = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10);
        } else if ( modelHandle.includes("Sphere")) {
            geometry = new THREE.SphereGeometry(1, 32, 32);
        } else if ( modelHandle.includes("Cone")) {
            geometry = new THREE.ConeGeometry(1, 1, 32);
        }
        
        // Create a new model, and add it to the scene and allModels object.
        model = new THREE.Mesh( geometry, material );
        scene.add( model );
        allModels[modelHandle] = model;
        
        // Add a new entry to the model drop down.
        var newModelEntry = document.createElement("option");
        newModelEntry.textContent = modelHandle;
        newModelEntry.value = modelHandle;
        currentModelSelect.add(newModelEntry);
    }
}
    

// Loads a JSON model from the given filepath into the given model object.
function loadModel(filename, modelHandle) {
    if (loader == null) {
        console.log("The JSON loader was not created before loadModel() was called.");
        return null;
    } else {
        var relativeFilePath = "./models/" + filename + ".json";
        loader.load(relativeFilePath, function (geometry, materials) {
            var material = new THREE.MultiMaterial(materials)
            var modelObject = new THREE.Mesh(geometry, material);
            scene.add(modelObject);
            allModels[modelHandle] = modelObject;
            
            // Add a new entry to the model drop down.
            var newModelEntry = document.createElement("option");
            newModelEntry.textContent = modelHandle;
            newModelEntry.value = modelHandle;
            currentModelSelect.add(newModelEntry);
        });
    }
}

// Removes the model specified by modelHandle.
function removeModel(modelHandle) {
    if (allModels[modelHandle]) {
        var entryToRemove = document.querySelector('option[value="' + modelHandle + '"]');
        currentModelSelect.remove(entryToRemove.index);
        scene.remove( allModels[modelHandle] );
        delete allModels[modelHandle];
    }
}

// A JSON model takes a while to load, so keep sending translate messages until they take.
function moveModel(modelHandle, newPositionArray) {
    if (allModels[modelHandle]) {
        allModels[modelHandle].position.x = newPositionArray[0];
        allModels[modelHandle].position.y = newPositionArray[1];
        allModels[modelHandle].position.z = newPositionArray[2];
    } else {
        setTimeout(function(){ moveModel(modelHandle, newPositionArray); }, 500);
    }
}

function rotateModel(modelHandle, newRotationArray) {
    if (allModels[modelHandle]) {
        allModels[modelHandle].rotation.x = newRotationArray[0];
        allModels[modelHandle].rotation.y = newRotationArray[1];
        allModels[modelHandle].rotation.z = newRotationArray[2];   
    } else {
        setTimeout(function(){ rotateModel(modelHandle, newRotationArray); }, 500);
    }
}

function scaleModel(modelHandle, newScaleArray) {
    if (allModels[modelHandle]) {
        allModels[modelHandle].scale.x = newScaleArray[0];
        allModels[modelHandle].scale.y = newScaleArray[1];
        allModels[modelHandle].scale.z = newScaleArray[2];
    } else {
        setTimeout(function(){ scaleModel(modelHandle, newScaleArray); }, 500);
    }
}

// Continually handle scene changes.
function update() {
    // Render the scene.
    render();
    // Schedule the next update frame.
    requestAnimationFrame( update );
}

// Update the renderer.
function render() {
    // Update the renderer.
    renderer.render( scene, camera );
}