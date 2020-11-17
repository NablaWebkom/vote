# vote [![DroneCI](https://ci.abakus.no/api/badges/webkom/vote/status.svg?branch=master)](https://ci.abakus.no/webkom/vote) [![Coverage Status](https://coveralls.io/repos/github/webkom/vote/badge.svg?branch=master)](https://coveralls.io/github/webkom/vote?branch=master) [![dependencies Status](https://david-dm.org/webkom/vote/status.svg)](https://david-dm.org/webkom/vote) [![devdependencies Status](https://david-dm.org/webkom/vote/dev-status.svg)](https://david-dm.org/webkom/vote?type=dev)

> vote optimizes the election

Digital voting system for Abakus' general assembly, built using the MEAN-stack (mongoDB, Express, AngularJS, Node.js).
Relevant (Norwegian) blog post: http://webkom.abakus.no/vote/

![vote](http://i.imgur.com/DU1CXQx.png)

## Setup

vote assumes you have a MongoDB-server running on `mongodb://localhost:27017/vote` and a redis-server running as `localhost:6379`. To
change the URL, export `MONGO_URL` and `REDIS_URL` as an environment variable.

```bash
$ git clone git@github.com:webkom/vote.git
$ cd vote

# Start MongoDB and Redis, both required for development and production
$ docker-compose up -d

# Install all dependencies
$ yarn

# Create a user via the CLI. You are promted to select usertype.
$ ./bin/users create-user <username> <cardKey>
```

## Usage

vote uses a RFID-reader to register and activate/deactivate users. This is done to make sure that only people that are at the location can vote. The RFID-reader needs to be connected to the computer that is logged in to the moderator panel.

An example deployment can be found in the `./deployment` folder.

### Development

```bash
$ yarn start
```

### Environment variables

- `MONGO_URL`
  - Url to the database connection
  - `default`: `mongodb://localhost:27017/vote`
- `REDIS_URL`
  - Hostname of the redis server
  - `default`: `localhost`
- `LOGO_SRC` _(optional)_
  - Url to the main logo on all pages
  - `default`: `/static/images/Abakule.jpg`
- `COOKIE_SECRET`
  - **IMPORTANT** to change this to a secret value in production!!
  - `default`: in dev: `localsecret`, otherwise empty

See `app.js` for the rest

### Production

```bash
$ yarn build
$ LOGO_SRC=https://my-domain.tld/logo.png NODE_ENV=production yarn start
```

## Using the card-readers

Make sure you have enabled Experimental Web Platform features and are using Google Chrome. Experimental features can be enabled by navigating to: chrome://flags/#enable-experimental-web-platform-features.
Please check that the USB card reader is connected. When prompted for permissions, please select the card reader (CP210x).

### Serial permissions (Linux)

When using the card readers on a linux based system there can be permission problems with **google-chrome**. Chrome needs access to the ports, and often the ports are controlled by another group, so chrome cannot use them. Therefore you must do one of the following:

1. Run google-chrome as `root`

```sh
$ sudo google-chrome
```

**OR**

2. Add your user to the `dialout` group.
   - Check what group the tty(USBPORT) is:
   ```
   $ ls -al /dev/ttyUSB* | cut -d ' ' -f 2`
   ```
   - Check what groups your user is added to:
   ```sh
   $ groups
   ```
   - Normally the `tty` is in the `dialout` group, so add your user to that group with:
   ```sh
   $ sudo usrmod -a -G dialout $USER
   ```

> You need to sign in and out to get the new privileges!

## Tests

vote uses mocha for the backend tests and cucumber.js/protractor for the frontend tests. To run them all you can do:

```bash
$ yarn test
# To run in headless mode:
$ HEADLESS=true yarn test
```

## Vote occasion

We have a list of every occasion vote has been used. If you or your organization use vote for your event we would love if you made a PR where you append your event to the list.

The list is located at `./usage.yml`. Just create a new entry at the bottom. Then run `yarn lint` to see if your YAML is correct.

---

MIT © webkom, Abakus Linjeforening
