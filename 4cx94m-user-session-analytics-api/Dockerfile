FROM maven:3.8.7-eclipse-temurin-17
WORKDIR /app

# Copy only the repository_after project and the test script into the image
COPY repository_after /app/repository_after
COPY tests/run_after.sh /app/tests/run_after.sh

# Ensure script is executable and perform a no-test build to fetch dependencies at build time
RUN chmod +x /app/tests/run_after.sh \
	&& mvn -f repository_after/pom.xml -DskipTests package -q

# At runtime, run the test script which will use the cached dependencies/artifacts
CMD ["bash","-lc","chmod +x tests/run_after.sh && tests/run_after.sh"]
