import sys
import requests
from bs4 import BeautifulSoup


def fetch(bus_id='50', direction='Westbound', stop_id='4882'):
    url = f"https://www.ridetherapid.org/api/routes/routeStopInfo?routeNumber={bus_id}&direction={direction}&stopID={stop_id}&manualStopID="
    print(url)

    response = requests.get(url)
    if not response.ok:
        print("Something went wrong with the url.")
        sys.exit(2)

    soup = BeautifulSoup(response.text, 'html.parser')
    soup.prettify()

    # get the estimated arrival times
    # estimated_time = soup.find("b", text=True)
    # print(estimated_time)

    # get the next estimated arrival times
    # next_times = soup.find("span", class_="times", text=True)
    print(soup.text)
    # print(next_times)

    # data = estimated_time + ", " + next_times
    # print(data)

    file = open("./data.txt", "w+")
    file.write(soup.text)
    file.close()


if __name__ == "__main__":
    print("Fetching data...")
    fetch()

# https://m.ridetherapid.org/next-bus?
#
# routeNumber=50&direction=Westbound&stopID=4882
