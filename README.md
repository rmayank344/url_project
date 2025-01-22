How to Run the URL Shortener Project
Step 1: Ensure Prerequisites are Installed
    1. Install Docker and Docker Compose:
    2. Verify installation by running:
         bash
        docker --version
        docker-compose --version
    
Step 2: Clone the Repository
    1. Clone the project repository:
          bash git clone <repository-url>
    2. Navigate to the project directory:
          bash cd <project-folder-name>

Step 3: Build and Start Docker Containers
        1. Run the following command to build and start the containers:
              bash docker-compose up -d
               This will:
                . Build the url-shortener-app container.
                . Pull and run the mongo:latest container for MongoDB.
      2. Verify the containers are running:
              bash docker ps
              You should see two containers running:
                  . url-shortner-container (your app)
                  . mongodb (MongoDB database)

Step 6: Test the Application
       1. Open your browser or API testing tool (e.g., Postman).
       2. Use the base URL http://localhost:5001/api to test the endpoints.


URL Shortener API Documentation

Base URL

All endpoints are prefixed with the base URL: http://localhost:5001/api

1. Shorten URL

Endpoint: POST /shorten

Description

Generates a shortened URL for the provided original URL.

Request Body

{
  "originalUrl": "https://example.com/some/long/url",
  "customAlias": "myAlias"  // Optional
}

Response

{
  "shortUrl": "http://localhost:5001/myAlias",
  "originalUrl": "https://example.com/some/long/url"
}

Possible Status Codes

200 OK: URL shortened successfully.

400 Bad Request: Missing or invalid data.

409 Conflict: Alias already in use.

2. Redirect to Original URL

Endpoint: GET /shorten/:alias

Description

Redirects the user to the original URL associated with the given shortened URL.

Parameters

alias (path parameter): The alias for the shortened URL.

Response

Redirects to the original URL.

Possible Status Codes

302 Found: Redirect successful.

404 Not Found: Short URL does not exist.

3. Analytics for a Short URL

Endpoint: GET /analytics/:alias

Description

Retrieves analytics for the given shortened URL.

Parameters

alias (path parameter): The alias for the shortened URL.

Response

{
  "shortUrl": "http://localhost:5001/myAlias",
  "originalUrl": "https://example.com/some/long/url",
  "clicks": 123,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastAccessed": "2025-01-10T12:34:56.000Z"
}

Possible Status Codes

200 OK: Analytics retrieved successfully.

404 Not Found: Short URL does not exist.

4. Topic-Based Analytics

Endpoint: GET /analytics/topic/:topic

Description

Retrieves analytics for URLs associated with a specific topic.

Parameters

topic (path parameter): The topic/category to retrieve analytics for.

Response

{
  "topic": "technology",
  "totalUrls": 5,
  "totalClicks": 250,
  "urls": [
    {
      "shortUrl": "http://localhost:5001/tech1",
      "clicks": 100
    },
    {
      "shortUrl": "http://localhost:5001/tech2",
      "clicks": 50
    }
  ]
}

Possible Status Codes

200 OK: Analytics retrieved successfully.

404 Not Found: No data found for the specified topic.

5. Overall Analytics

Endpoint: GET /analytics/overall/:userId

Description

Retrieves overall analytics for all shortened URLs of a specific user.

Parameters

userId (path parameter): The ID of the user whose analytics are to be retrieved.

Response

{
  "totalUrls": 10,
  "totalClicks": 1023,
  "mostPopular": {
    "shortUrl": "http://localhost:5001/popularAlias",
    "clicks": 456
  }
}

Possible Status Codes

200 OK: Analytics retrieved successfully.

6. Register User

Endpoint: POST /register

Description

Registers a new user.

Request Body

{
  "username": "john_doe",
  "email": "john.doe@example.com",
  "password": "securepassword123"
}

Response

{
  "message": "User registered successfully",
  "userId": "12345"
}

Possible Status Codes

201 Created: User registered successfully.

400 Bad Request: Missing or invalid data.

409 Conflict: User with the same email already exists.

7. Login User

Endpoint: POST /login

Description

Authenticates a user and returns a token.

Request Body

{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}

Response

{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Possible Status Codes

200 OK: Login successful.

401 Unauthorized: Invalid credentials.

In case of an error, the API responds with the following format:

{
  "error": "Error message"
}

Common Status Codes

500 Internal Server Error: An unexpected error occurred.

