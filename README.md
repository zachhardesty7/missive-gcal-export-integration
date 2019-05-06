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

*Copyright (c) 2019 || Zach Hardesty || [zachhardesty.com](https://zachhardesty.com)*
