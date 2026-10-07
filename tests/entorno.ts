import { urlsDeTest } from "./urls";

// La aplicación, dentro de los tests, también se conecta como app_sigilo.
process.env.APP_DATABASE_URL = process.env.DATABASE_URL = urlsDeTest().app;
process.env.STORAGE_DRIVER = "memoria";
