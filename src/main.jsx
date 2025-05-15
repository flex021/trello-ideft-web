import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles'
import GlobalStyles from '@mui/material/GlobalStyles'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { ConfirmProvider } from 'material-ui-confirm'

import { Provider } from 'react-redux'
import { store } from '~/redux/store.js'
import { BrowserRouter } from 'react-router-dom'

import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { injectStore } from './utils/authorizeAxios.js'
const persistor = persistStore(store)

injectStore(store)


ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <BrowserRouter basename='/'>
        <CssVarsProvider theme={theme}>
          <ConfirmProvider defaultOptions={{
            allowClose: false,
            dialogProps: { maxWidth: 'xs' }
          }}>
            <GlobalStyles styles={{ a: { textDecoration: 'none' } }}/>
            <CssBaseline />
            <App />
            <ToastContainer autoClose={2500}/>
          </ConfirmProvider>
        </CssVarsProvider>
      </BrowserRouter>
    </PersistGate>
  </Provider>
)
