#include "common.h"
#include "db.h"
#include <microhttpd.h>

// Extern declaration
int answer_to_connection(void *cls, struct MHD_Connection *connection,
                         const char *url, const char *method,
                         const char *version, const char *upload_data,
                         size_t *upload_data_size, void **con_cls);
void request_completed(void *cls, struct MHD_Connection *connection,
                       void **con_cls, enum MHD_RequestTerminationCode toe);

#define PORT 8080

int main() {
    setbuf(stdout, NULL); // Disable buffering
    printf("Starting C Backend Server on port %d...\n", PORT);
    
    // Seed random
    srand(time(NULL));
    
    // Init DB
    db_init();
    
    struct MHD_Daemon *daemon;
    daemon = MHD_start_daemon(MHD_USE_THREAD_PER_CONNECTION | MHD_USE_INTERNAL_POLLING_THREAD | MHD_USE_DEBUG,
                              PORT, NULL, NULL,
                              (MHD_AccessHandlerCallback)&answer_to_connection, NULL,
                              MHD_OPTION_NOTIFY_COMPLETED, request_completed, NULL,
                              MHD_OPTION_END);
    if (NULL == daemon) {
        fprintf(stderr, "Failed to start daemon\n");
        return 1;
    }
    
    printf("Server running. waiting for requests...\n");
    
    // Keep the main thread alive indefinitely
    while (1) {
        #ifdef _WIN32
            Sleep(1000);
        #else
            sleep(1);
        #endif
    }
    
    MHD_stop_daemon(daemon);
    db_cleanup();
    
    return 0;
}
