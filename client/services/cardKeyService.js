const checksum = data =>
  data.reduce((previousValue, currentValue) => previousValue ^ currentValue);

const createMessage = (command, data) => {
  const payload = [data.length + 1, command, ...data];
  payload.push(checksum(payload));

  return new Uint8Array([0xaa, 0x00, ...payload, 0xbb]).buffer;
};

const convertUID = data => {
  const reversed = data
    .join('')
    .match(/.{1,2}/g)
    .reverse()
    .join('');
  return parseInt(reversed, 16);
};

const validate = (data, receivedChecksum) => {
  const dataDecimal = data.map(item => parseInt(item, 16));
  const calculatedChecksum = checksum(dataDecimal);
  return Math.abs(calculatedChecksum % 255) === parseInt(receivedChecksum, 16);
};

// Constants
const replies = {
  '00': 'OK', // eslint-disable-line
  '01': 'ERROR', // eslint-disable-line
  '83': 'NO CARD', // eslint-disable-line
  '87': 'UNKNOWN INTERNAL ERROR', // eslint-disable-line
  '85': 'UNKNOWN COMMAND', // eslint-disable-line
  '84': 'RESPONSE ERROR', // eslint-disable-line
  '82': 'READER TIMEOUT', // eslint-disable-line
  '90': 'CARD DOES NOT SUPPORT THIS COMMAND', // eslint-disable-line
  '8f': 'UNSUPPORTED CARD IN NFC WRITE MODE' // eslint-disable-line
};

const readCardCommand = createMessage(0x25, [0x26, 0x00]);

const parseData = response => {
  const hexValues = [];
  for (let i = 0; i < response.length; i += 1) {
    hexValues.push((response[i] < 16 ? '0' : '') + response[i].toString(16));
  }
  const stationId = hexValues[1];
  const length = hexValues[2];
  const status = hexValues[3];
  const flag = hexValues[4];
  const data = hexValues.slice(5, hexValues.length - 1);
  const checksum = hexValues[hexValues.length - 1];
  const valid = validate([stationId, length, status, flag, ...data], checksum);
  return {
    valid: valid,
    status: replies[status],
    data: valid && replies[status] === 'OK' ? convertUID(data) : data
  };
};

module.exports = [
  '$window',
  '$location',
  '$rootScope',
  'alertService',
  function($window, $location, $rootScope, alertService) {
    $rootScope.$on('$routeChangeStart', function() {
      angular.element($window).unbind('message');
      clearInterval($rootScope.serialInterval);
    });

    return {
      listen: async function(cb) {
        angular.element($window).bind('message', function(e) {
          cb(e.data);
        });
        let port;
        if (!$rootScope.serialWriter || !$rootScope.serialReader) {
          try {
            port = await $window.navigator.serial.requestPort({});

            await port.open({ baudrate: 9600 });
            $rootScope.serialWriter = port.writable.getWriter();
            $rootScope.serialReader = port.readable.getReader();
          } catch (e) {
            $rootScope.$apply(() => {
              $location.path('/moderator/serial_error');
            });
          }
        }
        if (!$rootScope.serialWriter || !$rootScope.serialReader) {
          return;
        }

        let lastTime = 0;
        let lastData = 0;
        const onComplete = input => {
          const { valid, status, data } = parseData(input);
          if (valid && status == 'OK') {
            if (data !== lastData || Date.now() - lastTime > 2000) {
              cb(data);
              lastTime = Date.now();
              lastData = data;
            }
          }
        };

        const readResult = async () => {
          const message = [];
          let finished = false;
          while (!finished) {
            const { value } = await $rootScope.serialReader.read();
            for (let i = 0; i < value.length; i++) {
              if (value[i] == 0xbb) {
                finished = true;
                break;
              }
              message.push(value[i]);
            }
          }
          onComplete(message);
        };

        $rootScope.serialInterval = setInterval(() => {
          $rootScope.serialWriter.write(readCardCommand);
          readResult();
        }, 500);
      }
    };
  }
];
