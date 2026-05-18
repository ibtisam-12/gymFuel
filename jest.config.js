module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-redux|@reduxjs/toolkit|redux|immer|reselect|react-native-toast-message|@react-native-async-storage)/)',
  ],
};
