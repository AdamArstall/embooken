/** @type {import('extension').FileConfig} */
export default {
    commands: {
        build: {
            polyfill: true,
            zip: true,
            zipSource: true,
            zipFilename: "release",
        },
    },
};
