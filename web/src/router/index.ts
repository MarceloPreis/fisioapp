import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
const LoginView = () => import('../views/LoginView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const PatientPlanView = () => import('../views/PatientPlanView.vue');
const PatientsView = () => import('../views/PatientsView.vue');
const ExercisesView = () => import('../views/ExercisesView.vue');
const CategoriesView = () => import('../views/CategoriesView.vue');
const PrescriptionsView = () => import('../views/PrescriptionsView.vue');
const TemplatesView = () => import('../views/TemplatesView.vue');
const PatientSessionsView = () => import('../views/PatientSessionsView.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/patients/:id/plan', name: 'patient-plan', component: PatientPlanView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/patients/:id/progress', name: 'patient-progress', component: () => import('../views/PatientProgressView.vue'), meta: { requiresAuth: true, physioOnly: true } },
    { path: '/patients', name: 'patients', component: PatientsView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/exercises', name: 'exercises', component: ExercisesView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/categories', name: 'categories', component: CategoriesView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/prescriptions', name: 'prescriptions', component: PrescriptionsView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/templates', name: 'templates', component: TemplatesView, meta: { requiresAuth: true, physioOnly: true } },
    { path: '/my-exercises', name: 'my-exercises', component: PatientSessionsView, meta: { requiresAuth: true, patientOnly: true } },
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth) {
    await authStore.checkAuth();
    if (!authStore.isAuthenticated) {
      return { name: 'login' };
    }
    
    // Redirect logic based on role
    if (to.meta.physioOnly && authStore.user?.role === 'PATIENT') {
      return { name: 'my-exercises' };
    }
    if (to.meta.patientOnly && authStore.user?.role !== 'PATIENT') {
      return { name: 'dashboard' };
    }
  } else if (to.name === 'login') {
    await authStore.checkAuth();
    if (authStore.isAuthenticated) {
      if (authStore.user?.role === 'PATIENT') {
        return { name: 'my-exercises' };
      }
      return { name: 'dashboard' };
    }
  }
  
  if (to.path === '/' && authStore.isAuthenticated && authStore.user?.role === 'PATIENT') {
    return { name: 'my-exercises' };
  }

  return;
});

export default router;
