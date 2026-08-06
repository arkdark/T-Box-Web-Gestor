import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import ClientList from './components/ClientList'
import ClientDetail from './components/ClientDetail'
import ReleaseList from './components/ReleaseList'
import Config from './components/Config'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<ClientList />} />
        <Route path="/clients/:machineId" element={<ClientDetail />} />
        <Route path="/releases" element={<ReleaseList />} />
        <Route path="/config" element={<Config />} />
      </Routes>
    </Layout>
  )
}
