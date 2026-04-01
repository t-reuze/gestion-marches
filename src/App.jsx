import { createHashRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import Dashboard       from './pages/Dashboard';
import Reporting       from './pages/Reporting';
import Notation        from './pages/Notation';
import Reponses        from './pages/Reponses';
import MarcheInfos     from './pages/MarcheInfos';
import Formations      from './pages/Formations';
import FormationDetail from './pages/FormationDetail';
import AnalyseMarche   from './pages/AnalyseMarche';
import AnalyseUnicancer from './pages/AnalyseUnicancer';
import ContactsAnnuaire from './features/contacts/ContactsAnnuaire';
import MarcheInterlocuteurs from './features/contacts/MarcheInterlocuteurs';
import ErpKpi          from './features/erp/ErpKpi';
import { NotationProvider, useNotation } from './context/NotationContext';
import { MarcheMetaProvider } from './context/MarcheMetaContext';
import { FormationsMetaProvider } from './context/FormationsMetaContext';
import { marches }     from './data/mockData';

function MarcheRedirect() {
  const { id } = useParams();
  const { getSession } = useNotation();
  const m = marches.find(x => x.id === id);
  if (!m) return <Navigate to="/" replace />;
  if (m.hasAnalyse || getSession(id)) return <Navigate to={'/marche/' + id + '/analyse'} replace />;
  return <Navigate to={'/marche/' + id + '/analyse'} replace />;
}

const router = createHashRouter([
  { path: '/',                              element: <Dashboard /> },
  { path: '/reporting',                     element: <Reporting /> },
  { path: '/formations',                    element: <Formations /> },
  { path: '/formations/:id',                element: <FormationDetail /> },
  { path: '/contacts',                      element: <ContactsAnnuaire /> },
  { path: '/analyse-unicancer',             element: <AnalyseUnicancer /> },
  { path: '/marche/:id/ao',                 element: <AnalyseMarche /> },
  { path: '/marche/:id/analyse',            element: <AnalyseMarche /> },
  { path: '/marche/:id/reporting',          element: <Reporting /> },
  { path: '/marche/:id/notation',           element: <Notation /> },
  { path: '/marche/:id/reponses',           element: <Reponses /> },
  { path: '/marche/:id/infos',              element: <MarcheInfos /> },
  { path: '/marche/:id/interlocuteurs',     element: <MarcheInterlocuteurs /> },
  { path: '/marche/:id/erp',                element: <ErpKpi /> },
  { path: '/marche/:id',                    element: <MarcheRedirect /> },
  { path: '*',                              element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <FormationsMetaProvider>
    <MarcheMetaProvider>
    <NotationProvider>
      <RouterProvider router={router} />
    </NotationProvider>
    </MarcheMetaProvider>
    </FormationsMetaProvider>
  );
}
