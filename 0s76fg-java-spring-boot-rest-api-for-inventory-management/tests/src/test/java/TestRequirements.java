
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static io.restassured.RestAssured.when;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.fail;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class TestRequirements {

    private static String BASE_URI = "http://app:8080/api";
    // Generate a random 6-digit number string
    private static String RANDOM_ID = String.format("%06d", new java.util.Random().nextInt(1000000));

    @BeforeAll
    public static void setup() {
        RestAssured.baseURI = BASE_URI;
        
        // Wait for API to be ready
        int maxRetries = 30;
        for (int i = 0; i < maxRetries; i++) {
            try {
                given().get("/products").then().statusCode(anyOf(is(200), is(204)));
                System.out.println("API is ready.");
                return;
            } catch (Exception e) {
                System.out.println("Waiting for API... " + (i + 1));
                try { TimeUnit.SECONDS.sleep(2); } catch (InterruptedException ignored) {}
            }
        }
        fail("API did not start in time");
    }

    // 1. Product Entity & 5. Product REST Endpoints
    @Test
    @Order(1)
    public void testProductLifecycle() {
        Map<String, Object> product = new HashMap<>();
        product.put("sku", "TST-" + RANDOM_ID);
        product.put("name", "JUnit Product");
        product.put("category", "Test");
        product.put("unitPrice", 100.00);

        // CREATE
        int id = given()
            .contentType(ContentType.JSON)
            .body(product)
            .when()
            .post("/products")
            .then()
            .statusCode(201)
            .body("sku", equalTo("TST-" + RANDOM_ID))
            .extract().path("id");

        // GET
        given().get("/products/" + id).then().statusCode(200).body("name", equalTo("JUnit Product"));

        // UPDATE
        Map<String, Object> update = new HashMap<>();
        update.put("name", "Updated Product");
        update.put("unitPrice", 150.00); 
        
        given()
            .contentType(ContentType.JSON)
            .body(update)
            .when()
            .put("/products/" + id)
            .then()
            .statusCode(200)
            .body("name", equalTo("Updated Product"));

        // DELETE
        given().delete("/products/" + id).then().statusCode(204);

        // Soft Delete Check
        given().get("/products/" + id).then().statusCode(200).body("active", equalTo(false));
    }

    // 2. Location Entity & 6. Location REST Endpoints
    @Test
    @Order(2)
    public void testLocationLifecycle() {
        Map<String, Object> address = new HashMap<>();
        address.put("street", "123 Test St");
        address.put("city", "Test City");
        address.put("state", "TS");
        address.put("zip", "12345");
        address.put("country", "Testland");

        Map<String, Object> location = new HashMap<>();
        location.put("code", "LOC-" + RANDOM_ID);
        location.put("name", "Test Warehouse");
        location.put("type", "WAREHOUSE");
        location.put("capacity", 1000);
        location.put("address", address);

        // CREATE
        int id = given()
            .contentType(ContentType.JSON)
            .body(location)
            .when()
            .post("/locations")
            .then()
            .statusCode(201)
            .body("code", equalTo("LOC-" + RANDOM_ID))
            .extract().path("id");

        // GET
        given().get("/locations/" + id).then().statusCode(200);

        // GET Inventory at location (Empty initially)
        given().get("/locations/" + id + "/inventory").then().statusCode(200).body("size()", is(0));
    }

    // 8. Receive, 9. Transfer, 10. Adjust, 17. Audit Trail
    @Test
    @Order(3)
    public void testInventoryOperations() {
        // Setup Product
        Map<String, Object> prod = new HashMap<>();
        prod.put("sku", "INV-" + RANDOM_ID);
        prod.put("name", "Inventory Item");
        prod.put("category", "Test");
        prod.put("unitPrice", 10.00);
        int pid = given().contentType(ContentType.JSON).body(prod).post("/products").then().statusCode(201).extract().path("id");

        // Setup Locations
        Map<String, Object> addr = new HashMap<>();
        addr.put("street", "S"); addr.put("city", "C"); addr.put("state", "S"); addr.put("zip", "Z"); addr.put("country", "C");
        
        Map<String, Object> locA = new HashMap<>();
        locA.put("code", "WH-A-" + RANDOM_ID); locA.put("name", "Warehouse A"); locA.put("type", "WAREHOUSE"); locA.put("capacity", 100); locA.put("address", addr);
        int lidA = given().contentType(ContentType.JSON).body(locA).post("/locations").then().statusCode(201).extract().path("id");

        Map<String, Object> locB = new HashMap<>();
        locB.put("code", "WH-B-" + RANDOM_ID); locB.put("name", "Warehouse B"); locB.put("type", "WAREHOUSE"); locB.put("capacity", 100); locB.put("address", addr);
        int lidB = given().contentType(ContentType.JSON).body(locB).post("/locations").then().statusCode(201).extract().path("id");

        // 8. RECEIVE
        Map<String, Object> item = new HashMap<>();
        item.put("productId", pid);
        item.put("quantity", 50);
        item.put("reorderPoint", 10);

        Map<String, Object> receive = new HashMap<>();
        receive.put("locationId", lidA);
        receive.put("items", List.of(item));
        receive.put("reference", "REF-001");
        receive.put("performedBy", "Tester");

        given().contentType(ContentType.JSON).body(receive).post("/inventory/receive").then().statusCode(200);

        // Verify Stock
        given().get("/inventory/location/" + lidA).then().statusCode(200)
            .body("[0].quantity", equalTo(50));

        // 9. TRANSFER (20 units from A to B)
        Map<String, Object> transfer = new HashMap<>();
        transfer.put("productId", pid);
        transfer.put("fromLocationId", lidA);
        transfer.put("toLocationId", lidB);
        transfer.put("quantity", 20);
        transfer.put("reference", "TRF-001");
        transfer.put("performedBy", "Tester");
        
        given().contentType(ContentType.JSON).body(transfer).post("/inventory/transfer").then().statusCode(200);

        // Verify Transfer
        given().get("/inventory/location/" + lidA).then().body("[0].quantity", equalTo(30));
        given().get("/inventory/location/" + lidB).then().body("[0].quantity", equalTo(20));

        // 10. ADJUST (Remove 5 from A)
        Map<String, Object> adjust = new HashMap<>();
        adjust.put("productId", pid);
        adjust.put("locationId", lidA);
        adjust.put("adjustmentQuantity", -5);
        adjust.put("reference", "ADJ-001");
        adjust.put("reason", "Broken");
        adjust.put("performedBy", "Tester");

        given().contentType(ContentType.JSON).body(adjust).post("/inventory/adjust").then().statusCode(200);
        given().get("/inventory/location/" + lidA).then().body("[0].quantity", equalTo(25));

        // 17. Verify Audit Trail
        given().get("/movements?reference=REF-001").then().body("content[0].type", equalTo("RECEIPT"));
        given().get("/movements?reference=TRF-001").then().body("content[0].type", equalTo("TRANSFER"));
    }

    // 12. Negative Quantity, 13. Insufficient Stock, 14. Capacity
    @Test
    @Order(4)
    public void testValidations() {
        // Setup
        int pid = given().contentType(ContentType.JSON).body(Map.of("sku","VAL-" + RANDOM_ID,"name","V","category","C","unitPrice",1)).post("/products").path("id");
        
        Map<String, Object> addr = new HashMap<>();
        addr.put("street", "S"); addr.put("city", "C"); addr.put("state", "S"); addr.put("zip", "Z"); addr.put("country", "C");
        int lid = given().contentType(ContentType.JSON).body(Map.of("code","VAL-LOC-" + RANDOM_ID,"name","L","type","WAREHOUSE","capacity",50,"address",addr)).post("/locations").path("id");

        // Init with 10
        given().contentType(ContentType.JSON).body(Map.of("locationId", lid, "items", List.of(Map.of("productId", pid, "quantity", 10)), "reference", "I", "performedBy", "T")).post("/inventory/receive");

        // 12. Fail manual adjust to negative
        given().contentType(ContentType.JSON)
            .body(Map.of("productId", pid, "locationId", lid, "adjustmentQuantity", -20, "reference", "X", "reason", "R", "performedBy", "T"))
            .post("/inventory/adjust")
            .then().statusCode(422)
            .body("message", containsString("negative quantity"));

        // 13. Fail transfer more than available
        int lid2 = given().contentType(ContentType.JSON).body(Map.of("code","VAL-LOC2-" + RANDOM_ID,"name","L2","type","WAREHOUSE","capacity",50,"address",addr)).post("/locations").path("id");
        given().contentType(ContentType.JSON)
            .body(Map.of("productId", pid, "fromLocationId", lid, "toLocationId", lid2, "quantity", 15, "reference", "X", "performedBy", "T"))
            .post("/inventory/transfer")
            .then().statusCode(422);

        // 14. Fail capacity exceeded
        // Capacity 50, Current 10. Try add 41.
        given().contentType(ContentType.JSON).body(Map.of("locationId", lid, "items", List.of(Map.of("productId", pid, "quantity", 41)), "reference", "X", "performedBy", "T"))
            .post("/inventory/receive")
            .then().statusCode(422); // Unprocessable Entity
    }
}
