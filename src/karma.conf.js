// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '', // Cambiado a vacío para que use la raíz relativa a donde esté el archivo
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      // Forzamos la salida a la carpeta 'coverage' en la raíz del proyecto
      dir: require('path').join(__dirname, '../coverage'),
      // lcovonly es el formato que exige SonarCloud para importar cobertura
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true,
    },
    // Añadimos 'coverage-istanbul' a los reporters para activar la generación
    reporters: ['progress', 'kjhtml', 'coverage-istanbul'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    // En CI, autoWatch debe ser false para que no se quede esperando cambios
    autoWatch: false,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },
    // singleRun debe ser true para que el proceso de GitHub Actions finalice tras los tests
    singleRun: true,
    restartOnFileChange: false
  });
};
