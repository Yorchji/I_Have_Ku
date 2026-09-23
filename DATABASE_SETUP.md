# Database connection

The backend now uses MySQL and the existing tables shown in phpMyAdmin: `Brand`, `Cart`, `CartDtl`, `Member`, `Product`, and `ProductType`. It does not query `products` or `users`.

1. Copy `backend/.env.example` to `backend/.env` and enter the MySQL host, port, username, and password. Use the host that the backend server can reach; `localhost` is correct only when MySQL runs on that same machine.
2. Set `DB` to the database name shown in phpMyAdmin (`ip_std673020269` in the screenshot).
3. Copy `fontend/kushop/.env.example` to `fontend/kushop/.env.local`. Set `VITE_API_URL` to the backend URL. For the server shown in your screenshot, that is `http://119.59.102.161:3057`.
4. The current server at `http://119.59.102.161:3057` returned 404 for `/products`, `/`, and `/docs` when checked. Upload [backend-mysql-deploy.zip](backend-mysql-deploy.zip) to `/app` on that host, then in its shell run `unzip -o backend-mysql-deploy.zip -d /app`, `npm install`, and `node server.js`. Add the database settings from step 1 to that host's environment before starting it.
5. Restart the frontend after changing its environment. In the browser, open `http://119.59.102.161:3057/products`; it should return a JSON array of rows from `Product`.

The phpMyAdmin screenshot alone does not provide MySQL credentials. Keep those values in `backend/.env`; do not put them in the React frontend.
