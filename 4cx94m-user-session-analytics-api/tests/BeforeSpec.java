package com.example.sessions;

public class BeforeSpec {
    public static void main(String[] args) throws Exception {
        SessionAnalyticsController ctrl = new SessionAnalyticsController();

        // Check controller statelessness: fail if there are mutable instance fields
        java.lang.reflect.Field[] fields = ctrl.getClass().getDeclaredFields();
        for (java.lang.reflect.Field f : fields) {
            if (!java.lang.reflect.Modifier.isStatic(f.getModifiers()) && !java.lang.reflect.Modifier.isFinal(f.getModifiers())) {
                System.err.println("FAIL: mutable instance field: " + f.getName());
                System.exit(1);
            }
        }

        // Create a session where end < start using the Session bean
        Class<?> sessionClass = Class.forName("com.example.sessions.Session");
        Object s = sessionClass.getDeclaredConstructor().newInstance();
        java.lang.reflect.Field start = sessionClass.getDeclaredField("startTime");
        java.lang.reflect.Field end = sessionClass.getDeclaredField("endTime");
        start.setAccessible(true); end.setAccessible(true);
        start.setLong(s, 2000L); end.setLong(s, 1000L);

        @SuppressWarnings({"rawtypes","unchecked"})
        java.util.List list = java.util.Arrays.asList(s);

        try {
            Object res = ctrl.analyze(list);
            System.err.println("FAIL: analyze accepted session with end < start, result=" + res);
            System.exit(1);
        } catch (Throwable ex) {
            System.out.println("OK: analyze rejected invalid session or threw: " + ex.getClass().getName());
        }

        System.out.println("Before spec completed");
        System.exit(0);
    }
}
