const checksum = (data) =>
  data.reduce((previousValue, currentValue) => previousValue ^ currentValue);

const createMessage = (command, data) => {
  const payload = [data.length + 1, command, ...data];
  payload.push(checksum(payload));

  return new Uint8Array([0xaa, 0x00, ...payload, 0xbb]).buffer;
};

const convertUID = (data) => {
  const reversed = data
    .join('')
    .match(/.{1,2}/g)
    .reverse()
    .join('');
  return parseInt(reversed, 16);
};

const validate = (data, receivedChecksum) => {
  const dataDecimal = data.map((item) => parseInt(item, 16));
  const calculatedChecksum = checksum(dataDecimal);
  return Math.abs(calculatedChecksum % 255) === parseInt(receivedChecksum, 16);
};

// prettier-ignore
const replies = {
  '00': 'OK',
  '01': 'ERROR',
  '83': 'NO CARD',
  '87': 'UNKNOWN INTERNAL ERROR',
  '85': 'UNKNOWN COMMAND',
  '84': 'RESPONSE ERROR',
  '82': 'READER TIMEOUT',
  '90': 'CARD DOES NOT SUPPORT THIS COMMAND',
  '8f': 'UNSUPPORTED CARD IN NFC WRITE MODE',
};

const readCardCommand = createMessage(0x25, [0x26, 0x00]);

const parseData = (response) => {
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
    data: valid && replies[status] === 'OK' ? convertUID(data) : data,
  };
};

module.exports = [
  '$window',
  '$location',
  '$rootScope',
  'alertService',
  function ($window, $location, $rootScope, alertService) {
    $rootScope.$on('$routeChangeStart', function () {
      angular.element($window).unbind('message');
      clearInterval($rootScope.serialInterval);
    });

    return {
      listen: async function (cb) {
        // Listen to window messages for test compatability.
        angular.element($window).bind('message', function (e) {
          cb(e.data);
        });
        // Open serial connections if they are not already open
        if (!$rootScope.serialDevice && !$rootScope.ndef) {
          try {
            if (
              $window.navigator.userAgent.includes('Android') &&
              $window.NDEFReader &&
              (!$window.navigator.serial ||
                $window.confirm(
                  'You are using an Android device that (might) support web nfc. Click OK to use web nfc, and cancel to fallback to using a usb serial device.'
                ))
            ) {
              const ndef = new $window.NDEFReader();
              await ndef.scan();
              $rootScope.ndef = ndef;
            } else {
              const port = await $window.navigator.serial.requestPort({});
              await port.open({ baudRate: 9600 });
              $rootScope.serialDevice = {
                writer: port.writable.getWriter(),
                reader: port.readable.getReader(),
              };
            }
          } catch (e) {
            $rootScope.$apply(() => {
              $location.path('/moderator/serial_error');
            });
          }
        }
        if ($rootScope.ndef) {
          $rootScope.ndef.onreading = ({ message, serialNumber }) => {
            const data = convertUID(serialNumber.split(':'));
            cb(data);
          };
        } else if (!$rootScope.serialDevice) {
          let lastTime = 0;
          let lastData = 0;
          const onComplete = (input) => {
            const { valid, status, data } = parseData(input);
            if (valid && status == 'OK') {
              // Debounce
              if (data !== lastData || Date.now() - lastTime > 2000) {
                // data = card id
                cb(data);
                lastTime = Date.now();
                lastData = data;
              }
            }
          };

          const readResult = async () => {
            const message = [];
            let finished = false;
            // Keep reading bytes until the "end" byte is sent
            // The "end" byte is 0xbb
            while (!finished) {
              const { value } = await $rootScope.serialDevice.reader.read();
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

          // Constantly send the readCardCommand and read the result.
          // If there is no card, the result will be an error status,
          // which is handled in the onComplete function
          $rootScope.serialInterval = setInterval(() => {
            $rootScope.serialDevice.writer.write(readCardCommand);
            readResult();
          }, 500);
        }
      },
    };
  },
];
