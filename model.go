package main

// Message defines an object with data to be send to and from the server.
type Message struct {
	MessageType 	 int 		   `json:"messageType"`
	ModelHandle 	 string		 `json:"modelHandle"`
	FloatArrayData []float64 `json:"floatArrayData"`
	StringData		 string		 `json:"stringData"`
}

// Model saves the overall state of a model within 4 message variables.
type Model struct {
	createMessage, positionMessage, rotationMessage, scaleMessage Message
}
