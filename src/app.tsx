/**
 * @file Taro application entry file
 */

import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useTabBarPageClass} from '@/hooks/useTabBarPageClass'

// To implement login functionality, please refer to the code below to import the necessary package and add the Provider
// import {AuthProvider} from 'miaoda-auth-taro'
// import {supabase} from '@/client/supabase'
// <AuthProvider client={supabase}>{children}</AuthProvider>

import './app.scss'

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useTabBarPageClass()

  return children
}

export default App
