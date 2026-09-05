import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/ui/footer.component';
import { NavbarComponent } from './shared/ui/navbar.component';
import { ToastContainerComponent } from './shared/ui/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
