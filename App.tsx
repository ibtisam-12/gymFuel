import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigators/root';
import Toast from 'react-native-toast-message';

/**
 * GymFuel AI Main Mobile Entrypoint.
 * Wraps the Navigation and Authentication flows inside Redux.
 */
function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <NavigationContainer>
        {/* Status bar styled elegantly for OLED Dark Mode */}
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F1015"
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F1015' }}>
          <RootNavigator />
        </SafeAreaView>
      </NavigationContainer>
      <Toast />
    </Provider>
  );
}

export default App;
