# Node Express Boilerplate

This is a boilerplate for building a REST API using Node.js and Express.js. The boilerplate includes the following features:

- **Authentication**: The boilerplate uses JWT for authentication. The user can register, log in, and use the refresh token to obtain a new access token.
- **Error Handling**: The boilerplate includes error handling middleware to catch and handle errors.
- **Validation**: The boilerplate includes input validation using Joi.
- **Security**: The boilerplate includes security middleware such as helmet and csurf.
- **Database**: The boilerplate uses MongoDB as the database.
- **Testing**: The boilerplate includes unit tests using Jest and Supertest.

## How to use

1. Clone the repository and install the dependencies by running `npm install`.
2. Create a .env file in the root of the project and add the following variables:
    - `PORT`: The port number for the server.
    - `MONGO_URI`: The MongoDB connection string.
    - `JWT_SECRET`: The secret for generating the JWT.
    - `JWT_EXPIRES_IN`: The expiration time for the JWT.
    - `JWT_REFRESH_SECRET`: The secret for generating the refresh token.
    - `JWT_REFRESH_EXPIRES_IN`: The expiration time for the refresh token.
3. Run the server by running `npm start`.
4. Run the tests by running `npm test`.

## API Endpoints

The boilerplate includes the following API endpoints:

- **POST /auth/register**: Register a new user.
- **POST /auth/login**: Log in a user.
- **POST /auth/refresh-token**: Get a new access token using the refresh token.
- **POST /auth/forget-password**: Send a password reset email to the user.
- **POST /auth/reset-password**: Reset the user's password.
- **GET /user/all-users**: Get all users.
- **GET /user/all-admins**: Get all admin users.
- **GET /user/all-super-admins**: Get all super admin users.
- **GET /user/:id**: Get a user by ID.
- **PATCH /user/:id**: Update a user.
- **DELETE /user/:id**: Delete a user.
- **POST /user/upload-avatar**: Upload a user's avatar.

## Tests

The boilerplate includes unit tests using Jest and Supertest. The tests cover the following endpoints:

- **POST /auth/register**: Register a new user.
- **POST /auth/login**: Log in a user.
- **POST /auth/refresh-token**: Get a new access token using the refresh token.
- **POST /auth/forget-password**: Send a password reset email to the user.
- **POST /auth/reset-password**: Reset the user's password.
- **GET /user/all-users**: Get all users.
- **GET /user/all-admins**: Get all admin users.
- **GET /user/all-super-admins**: Get all super admin users.
- **GET /user/:id**: Get a user by ID.
- **PATCH /user/:id**: Update a user.
- **DELETE /user/:id**: Delete a user.
- **POST /user/upload-avatar**: Upload a user's avatar.
# lharris_backend
# lharris_backend
# aldridgec2016_backend
