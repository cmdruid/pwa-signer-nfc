I would like to create a typescript project template for a modern PWA application. I want this PWA to use the following technologies:

- Typescript
- React
- IndexedDB

I also want this PWA to have the following features:

- A background service with a message bus (for the frontend) and an event emitter (for the backend).
- A database controller between the backend service and the IndexedDB.
- A message API that allows the frontend to interact with the backend service (and database).
- A mutex based lock system for prompting the user (on the frontend) for approval of background tasks. These prompts should be shown in a new tab/window, and that tab/window should be destroyed after the user responds.
- Persistance of the background service for handing a persistent websocket connection.

The meat and potatoes of the application will be the background service. This service will be responsible for fetching data from the database and sending it to the frontend. It will also be responsible for updating the database when the user makes changes.

The background service will also be responsible for creating prompts for the user to approve certain tasks. This requires the backend processing requests (from the frontend)for tasks, halting the execution of the task, sending an instruction to the frontent to display a prompt to the user, and then processing the user's response.

The frontend will be responsible for displaying the prompts to the user, displaying the data from the database, and allowing the user to update the database.

Please guide me through the process of creating this project template.
