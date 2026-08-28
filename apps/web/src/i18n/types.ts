import type { ApiErrorCode, BookingStatus, Weekday } from '@booking/shared';

export type Language = 'bg' | 'en';

/**
 * Shape of the whole dictionary. Both `bg.ts` and `en.ts` implement this
 * interface, so a missing translation is a compile error rather than a blank
 * spot discovered later in the UI.
 */
export interface Translations {
  common: {
    cancel: string;
    remove: string;
    tryAgain: string;
    weekdaysShort: string[];
    weekdaysFull: Record<Weekday, string>;
  };

  language: {
    /** Describes, in the currently active language, what pressing the toggle does. */
    toggleAriaLabel: string;
  };

  booking: {
    header: {
      title: string;
      subtitle: string;
    };
    footer: {
      privacyNotice: string;
    };
    stepper: {
      ariaLabel: string;
      service: string;
      day: string;
      time: string;
      details: string;
    };
    services: {
      title: string;
      empty: string;
    };
    date: {
      title: string;
      previous: string;
      previousAria: string;
      thisMonth: string;
      next: string;
      nextAria: string;
      noFreeDays: string;
    };
    time: {
      title: string;
      empty: string;
    };
    details: {
      title: string;
      summaryService: string;
      summaryWhen: string;
      summaryDuration: string;
      summaryPrice: string;
      at: string;
      slotGoneTitle: string;
      pickAnotherTime: string;
      bookingFailedTitle: string;
      nameLabel: string;
      nameError: string;
      phoneLabel: string;
      phoneHint: string;
      phoneError: string;
      emailLabel: string;
      emailHint: string;
      emailError: string;
      submit: string;
    };
    success: {
      title: string;
      subtitle: string;
      summaryService: string;
      summaryWhen: string;
      summaryTime: string;
      summaryDuration: string;
      summaryReference: string;
      changeNotice: string;
      bookAnother: string;
    };
  };

  admin: {
    layout: {
      brand: string;
      signOut: string;
      nav: {
        today: string;
        calendar: string;
        appointments: string;
        services: string;
        hours: string;
        timeOff: string;
        settings: string;
      };
    };
    login: {
      brand: string;
      subtitle: string;
      tooManyAttempts: string;
      signInFailed: string;
      genericCheckDetails: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
    };
    today: {
      title: string;
      summary: (upcoming: number, total: number) => string;
      actionFailedTitle: string;
      empty: string;
      finishedToday: string;
    };
    calendar: {
      title: string;
      description: string;
      previous: string;
      thisWeek: string;
      next: string;
      apptCount: (count: number) => string;
      noAppt: string;
      today: string;
      empty: string;
    };
    appointments: {
      title: string;
      description: string;
      addAppointment: string;
      fromLabel: string;
      toLabel: string;
      clear: string;
      resultsTitle: string;
      found: (count: number) => string;
      empty: string;
    };
    services: {
      title: string;
      description: string;
      addService: string;
      disabledBadge: string;
      empty: string;
      edit: string;
      disable: string;
      enable: string;
      addTitle: string;
      editTitle: (name: string) => string;
      couldNotSave: string;
      nameLabel: string;
      descriptionLabel: string;
      durationLabel: string;
      durationHint: string;
      priceLabel: string;
      priceHint: string;
      sortOrderLabel: string;
      sortOrderHint: string;
      cancel: string;
      save: string;
    };
    workingHours: {
      title: string;
      description: string;
      saveWeek: string;
      couldNotSave: string;
      saved: string;
      closed: string;
      to: string;
      breakLabel: string;
      removeBreak: string;
      addBreak: string;
      openingAria: (day: string) => string;
      closingAria: (day: string) => string;
      breakStartAria: string;
      breakEndAria: string;
    };
    blockedTimes: {
      title: string;
      description: string;
      alreadyHasAppointments: string;
      couldNotBlock: string;
      blockAnyway: string;
      blockWholeDay: string;
      dateLabel: string;
      fromLabel: string;
      toLabel: string;
      reasonLabel: string;
      reasonHint: string;
      submit: string;
      upcomingTitle: string;
      empty: string;
      remove: string;
      to: string;
    };
    settings: {
      policyTitle: string;
      policyDescription: string;
      couldNotSave: string;
      saved: string;
      slotIntervalLabel: string;
      slotIntervalHint: string;
      leadTimeLabel: string;
      leadTimeHint: string;
      advanceWindowLabel: string;
      advanceWindowHint: string;
      save: string;
      deploymentTitle: string;
      deploymentDescription: string;
      timezoneLabel: string;
      currencyLabel: string;
      timezoneNote: string;
    };
    bookingEditor: {
      title: string;
      couldNotSave: string;
      dateLabel: string;
      timeLabel: string;
      serviceLabel: string;
      serviceHint: string;
      nameLabel: string;
      phoneLabel: string;
      notesLabel: string;
      notesHint: string;
      cancel: string;
      save: string;
    };
    manualBooking: {
      title: string;
      couldNotAdd: string;
      dateLabel: string;
      timeLabel: string;
      serviceLabel: string;
      nameLabel: string;
      phoneLabel: string;
      notesLabel: string;
      cancel: string;
      submit: string;
    };
  };

  shared: {
    notFound: {
      title: string;
      description: string;
      link: string;
    };
    bookingCard: {
      addedManually: string;
      confirm: string;
      done: string;
      noShow: string;
      edit: string;
      cancel: string;
    };
    queryState: {
      defaultEmpty: string;
      errorTitle: string;
      errorGeneric: string;
    };
    modal: {
      close: string;
    };
    spinner: {
      loading: string;
    };
  };

  status: Record<BookingStatus, string>;

  errors: {
    byCode: Record<ApiErrorCode, string>;
  };
}
