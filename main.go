package main

import (
	"log"
	"net/http"
	"strconv"
	"github.com/gorilla/websocket"
)

var clients = make(map[*websocket.Conn]bool) // connected clients
var broadcast = make(chan Message)           // broadcast channel

var allModels = make(map[string]*Model)  // save a global copy of all models
var removedIndices []string; // save any model indices removed (for reuse)

// Configure the upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	// Create a simple file server
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	// Configure websocket route
	http.HandleFunc("/ws", handleConnections)

	// Start listening for incoming messages
	go handleMessages()

	// Start the server on localhost port 8000 and log any errors
	log.Println("http server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

// GenerateNewModelHandle forms a unique identifier
// by taking a string containing a geometry type
// and prepending a unique index to it.
func GenerateNewModelHandle(geometryType string) string {
	if len(removedIndices) > 0  {
		reusedIndex := removedIndices[0]
		removedIndices = removedIndices[1:]
		return reusedIndex + " - " + geometryType;
	}
	return strconv.Itoa(len(allModels)) + " - " + geometryType
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Output to the console that there is an incoming connection.
	log.Println("Incoming connection")

	// Upgrade initial GET request to a websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Make sure we close the connection when the function returns
	defer ws.Close()

	// Register our new client
	clients[ws] = true

	// Initialize their scene to match the global scene...
	for _, model := range allModels {

		// Send all create messages.
		if model.createMessage.MessageType != 0 {
			initErr := ws.WriteJSON(model.createMessage)
			if initErr != nil {
				log.Printf("error: %v", initErr)
				ws.Close()
				delete(clients, ws)
			}
		}

		// Send all position messages.
		if model.positionMessage.MessageType != 0 {
			posErr := ws.WriteJSON(model.positionMessage)
			if posErr != nil {
				log.Printf("error: %v", posErr)
				ws.Close()
				delete(clients, ws)
			}
		}
		// Send all rotation messages.
		if model.rotationMessage.MessageType != 0 {
			rotErr := ws.WriteJSON(model.rotationMessage)
			if rotErr != nil {
				log.Printf("error: %v", rotErr)
				ws.Close()
				delete(clients, ws)
			}
		}
		// Send all scale messages.
		if model.scaleMessage.MessageType != 0 {
			scaleErr := ws.WriteJSON(model.scaleMessage)
			if scaleErr != nil {
				log.Printf("error: %v", scaleErr)
				ws.Close()
				delete(clients, ws)
			}
		}
	}

	for {
		var msg Message
		// Read in a new message as JSON and map it to a Message object
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("error: %v", err)
			delete(clients, ws)
			break
		}
		// Send the newly received message to the broadcast channel
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		// Grab the next message from the broadcast channel
		msg := <-broadcast

		// Process the message contents.
		if msg.MessageType == 1 { // Add message.
			// Output a message to the server log.
			log.Println("Add message received.")
			// Generate a unique model handle, and output it to the log.
			msg.ModelHandle = GenerateNewModelHandle(msg.ModelHandle)
			log.Println("New model handle: " + msg.ModelHandle)
			// Store the new model in allModels.
			allModels[msg.ModelHandle] = new(Model)
			allModels[msg.ModelHandle].createMessage = msg

		} else if msg.MessageType == 2 { // Remove message.
			// Output a message to the server log.
			log.Println("Remove message received.")
			// Remove the model from allModels.
			delete(allModels, msg.ModelHandle)
			// Maintain the array of removed indices.
			// This is so no duplicate model handles are generated.
			if len(allModels) == 0 {
				// There are no models. So the indices can start again at 0.
				removedIndices = nil
				log.Println("No models in the scene. Clearing removedIndices.")
			} else {
				// Append the number of the removed model to removedIndices.
				indexToBeRemoved := string(msg.ModelHandle[0])
				removedIndices = append(removedIndices,  indexToBeRemoved)
				// Output which index was added to removedIndices.
				log.Println("Adding " + indexToBeRemoved + " to removedIndices.")
			}

		} else if msg.MessageType == 3 { // Move message.
			// Output a message to the server log.
			log.Println("Move message received.")
			// Store the message for new users.
			allModels[msg.ModelHandle].positionMessage = msg

		} else if msg.MessageType == 4 { // Rotate message.
			// Output a message to the server log.
			log.Println("Rotate message received.")
			// Store the message for new users.
			allModels[msg.ModelHandle].rotationMessage = msg

		} else if msg.MessageType == 5 { // Scale message.
			// Output a message to the server log.
			log.Println("Scale message received.")
			// Store the message for new users.
			allModels[msg.ModelHandle].scaleMessage = msg
		}

		// Send the message out to every client that is currently connected
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("error: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}
