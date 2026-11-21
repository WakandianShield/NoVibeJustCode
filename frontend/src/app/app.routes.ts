import { Routes } from "@angular/router";
import { sessionGuard, sectionGuard } from "./guards";
import { HomeComponent } from "./components/home/home.component";
import { AuthComponent } from "./components/auth/auth.component";
import { CoursesComponent } from "./components/courses/courses.component";
import { CourseComponent } from "./components/course-detail/course-detail.component";
import { LessonComponent } from "./components/lesson/lesson.component";
import { CommunityComponent } from "./components/community/community.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { FriendsComponent } from "./components/friends/friends.component";
import { ChatComponent } from "./components/chat/chat.component";
import { SettingsComponent } from "./components/settings/settings.component";
import { PlansComponent } from "./components/plans/plans.component";
import { ProjectsComponent } from "./components/projects/projects.component";
import { ProjectComponent } from "./components/project-detail/project-detail.component";
import { LegalComponent } from "./components/legal/legal.component";

export const appRoutes: Routes = [
  { path: "", component: HomeComponent },
  { path: "registro", component: AuthComponent, data: { register: true } },
  { path: "acceso", component: AuthComponent },
  { path: "cursos", component: CoursesComponent },
  { path: "curso/:id", component: CourseComponent },
  {
    path: "seccion/:id",
    component: LessonComponent,
    canActivate: [sectionGuard],
  },
  {
    path: "aprendizaje",
    component: CoursesComponent,
    canActivate: [sessionGuard],
    data: { mine: true },
  },
  { path: "comunidad", component: CommunityComponent },
  { path: "perfil/:usuario", component: ProfileComponent },
  { path: "amigos", component: FriendsComponent, canActivate: [sessionGuard] },
  { path: "mensajes", component: ChatComponent, canActivate: [sessionGuard] },
  {
    path: "mensajes/:id",
    component: ChatComponent,
    canActivate: [sessionGuard],
  },
  { path: "planes", component: PlansComponent },
  {
    path: "proyectos",
    component: ProjectsComponent,
    canActivate: [sessionGuard],
  },
  {
    path: "proyecto/:id",
    component: ProjectComponent,
    canActivate: [sessionGuard],
  },
  {
    path: "configuracion",
    component: SettingsComponent,
    canActivate: [sessionGuard],
  },
  { path: "legal/:tipo", component: LegalComponent },
  { path: "**", redirectTo: "" },
];
