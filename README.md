# Missive GCal Export Integration

Adds an integration to the [Missive mail app](https://missiveapp.com/) that parses emails for dates/times
and displays them for exporting to Google Calendar if desired. Three files (`index.html`, `main.js`,
`theme.css`) need to be deployed to a server that the Missive app can reach. A sample is deployed
on [my website](https://zachhardesty.com/missive) or you can deploy the app from source on a local server by executing `yarn
dev` after probably needing to change the `yarn deploy` command from where it says `--subdomain
missive-gcal` to `--subdomain [YOUR TEXT]`.

## Activating the Integration

- open the Missive desktop app
- click on your profile at the bottom left
- click `Integrations` in the flyover menu
- click `Add integration` at the bottom of the modal
- select the `Custom` option with a gear at the bottom of the list
- Enter `Name` & `iFrame URL`
  - Name: `GCal Export`
  - iFrame URL: `https://[YOUR TEXT].localtunnel.me` or `https://zachhardesty.com/missive` or url of
    your server that's hosting the previously mentioned 3 files
- Close modal

## Acknowledgements

[chrono](https://github.com/wanasit/chrono) - natural language processing with a focus on dates and
times

[ESLint](https://github.com/eslint/eslint) - enforce my favorite styles

[ftp-deploy](https://github.com/simonh1000/ftp-deploy) - helpful for deploying integration to your
server and simpler than other tools

[live-server](https://github.com/tapio/live-server) - ultra simple quick local server with
hot-reloading for testing

[localtunnel](https://github.com/localtunnel/localtunnel) - allow Missive to access your local
server

[npm-run-all](https://github.com/mysticatea/npm-run-all) - run the server and the tunnel in parallel
in 1 terminal

*Copyright (c) 2019 || Zach Hardesty || [zachhardesty.com](https://zachhardesty.com)*
