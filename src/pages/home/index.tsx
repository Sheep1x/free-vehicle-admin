import {Text, View} from '@tarojs/components'
import type React from 'react'

// To implement the login feature, please refer to the example below. It demonstrates how to import and use the hook to check the user's login status, automatically redirect unauthenticated users, and retrieve their profile information.
//  you must import and wrap your application with the <AuthProvider /> component in your entry file (app.tsx)
// import {useAuth} from 'miaoda-auth-taro'
// const {user, logout} = useAuth({guard: true})

const Home: React.FC = () => {
  return (
    <View>
      <Text>Home Page</Text>
    </View>
  )
}

export default Home
