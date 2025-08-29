import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss']
})
export class StarRatingComponent {
  @Input() rating = 0;
  @Input() size = 22;
  @Input() editable = true;

  @Output() ratingChange = new EventEmitter<number>();

  hover = 0;

  set(val: number) {
    if (!this.editable) return;
    this.rating = val;
    this.ratingChange.emit(val);
  }
  enter(val: number) { if (this.editable) this.hover = val; }
  leave() { this.hover = 0; }

  get fillUntil() { return this.hover || Math.round(this.rating); }
}
