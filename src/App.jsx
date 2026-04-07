import { createHashRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import Dashboard            from './pages/Dashboard';
import Reporting            from './features/reporting/Reporting';
import Notation             from './features/notation/Notation';
import Reponses             from './pages/Reponses';
import MarcheInfos          from './pages/MarcheInfos';
import Formations           from './features/formations/Formations';
import FormationDetail      from './features/formations/FormationDetail';
import AnalyseMarche        from './features/ao/AnalyseMarche';
import ContactsAnnuaire     from './features/contacts/ContactsAnnuaire';
import ClccContactForm      from './features/contacts/ClccContactForm';
import MarcheInterlocuteurs from './features/contacts/MarcheInterlocuteurs';
import ErpKpi               from './features/erp/ErpKpi';
import { NotationProvider, useNotation } from './context/NotationContext';
import { MarcheMetaProvider }            from './context/MarcheMetaContext';
import { FormationsMetaProvider }        from './context/FormationsMetaContext';
import { ReportingDataProvider }         from './context/ReportingDataContext';
import { marches }          from './data/mockData';

function MarcheRedirect() {
  const { id } = useParams();
  const { getSession } = useNotation();
  const m = marches.find(x => x.id === id);
  if (!m) return <Navigate to="/" replace />;
  if (getSession(id))  return <Navigate to={'/marche/' + id + '/notation'}  replace />;
  if (m.hasReporting)  return <Navigate to={'/marche/' + id + '/reporting'} replace />;
  return <Navigate to={'/marche/' + id + '/notation'} replace />;
}

const router = createHashRouter([
  { path: '/',                              element: <Dashboard /> },
  { path: '/reporting',                     element: <Reporting /> },
  { path: '/formations',                    element: <Formations /> },
  { path: '/formations/:id',               element: <FormationDetail /> },
  { path: '/contacts',                      element: <ContactsAnnuaire /> },
  { path: '/contacts/:clccId/add',          element: <ClccContactForm /> },
  { path: '/marche/:id/reporting',          element: <Reporting /> },
  { path: '/marche/:id/notation',           element: <Notation /> },
  { path: '/marche/:id/reponses',           element: <Reponses /> },
  { path: '/marche/:id/infos',              element: <MarcheInfos /> },
  { path: '/marche/:id/analyse',            element: <AnalyseMarche /> },
  { path: '/marche/:id/interlocuteurs',     element: <MarcheInterlocuteurs /> },
  { path: '/marche/:id/erp',               element: <ErpKpi /> },
  { path: '/marche/:id',                    element: <MarcheRedirect /> },
  { path: '*',                              element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <FormationsMetaProvider>
    <MarcheMetaProvider>
    <ReportingDataProvider>
    <NotationProvider>
      <RouterProvider router={router} />
    </NotationProvider>
    </ReportingDataProvider>
    </MarcheMetaProvider>
    </FormationsMetaProvider>
  );
}
